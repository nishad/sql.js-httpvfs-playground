<!--
  @component
  SQL.js-httpvfs Playground

  A web-based playground for querying SQLite databases over HTTP using sql.js-httpvfs.
  This component provides a user interface for:
  - Specifying a remote SQLite database URL
  - Writing and executing SQL queries
  - Viewing query results in a table
  - Exporting results as JSON or CSV

  @author Nishad Thalhath
  @license MIT
-->
<script>
  /**
   * @fileoverview Main application component for sql.js-httpvfs playground.
   * Provides an interactive SQL query interface for remote SQLite databases.
   */

  // UI Components from flowbite-svelte
  import {
    Button,
    ButtonGroup,
    Spinner,
    Alert,
    Heading,
    P,
    A,
    Select,
    Input,
    Label,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
  } from "flowbite-svelte";

  // Core database functionality
  import { createDbWorker } from "sql.js-httpvfs";

  // Icons
  import { Sheet, FileJson2, Play } from "lucide-svelte";

  // Utilities
  import pTime from "p-time";
  import saveAs from "file-saver";
  import PapaParse from "papaparse";
  import prettyBytes from "pretty-bytes";
  import pluralize from "pluralize";

  // Code editor
  import { CodeJar } from "codejar";
  import Prism from "prismjs";
  import "prismjs/components/prism-sql";

  // ============================================================================
  // Constants
  // ============================================================================

  /**
   * URL to the SQL.js worker script.
   * @constant {URL}
   */
  const workerUrl = new URL(
    "sql.js-httpvfs/dist/sqlite.worker.js",
    import.meta.url
  );

  /**
   * URL to the SQL.js WebAssembly binary.
   * @constant {URL}
   */
  const wasmUrl = new URL(
    "sql.js-httpvfs/dist/sql-wasm.wasm",
    import.meta.url
  );

  /**
   * Available page size options for HTTP range requests.
   * Smaller sizes = more requests but less data per request.
   * Larger sizes = fewer requests but more data per request.
   * @constant {Array<{value: string, name: string}>}
   */
  const PAGE_SIZE_OPTIONS = [
    { value: "512", name: "512 bytes" },
    { value: "1024", name: "1024 bytes" },
    { value: "2048", name: "2048 bytes" },
    { value: "4096", name: "4096 bytes" },
    { value: "8192", name: "8192 bytes" },
    { value: "16384", name: "16384 bytes" },
    { value: "32768", name: "32768 bytes" },
  ];

  /**
   * Default SQL query to show in the editor.
   * @constant {string}
   */
  const DEFAULT_SQL_QUERY = `SELECT * FROM titles WHERE title_id LIKE "tt00000%";`;

  /**
   * Default database URL (relative to current origin).
   * @constant {string}
   */
  const DEFAULT_DB_URL = "https://nishad.github.io/sql.js-httpvfs-playground/db/imdb-titles-100000_1024_indexed.sqlite3";

  /**
   * Default database file size in bytes.
   * Required for GitHub Pages which doesn't return Content-Length on HEAD requests with gzip vary.
   * @constant {number}
   */
  const DEFAULT_DB_SIZE = 10261504;

  // ============================================================================
  // State
  // ============================================================================

  /** @type {string} Selected page size for HTTP range requests */
  let pageSize = $state("1024");

  /** @type {string} SQL query to execute */
  let sqlQuery = $state(DEFAULT_SQL_QUERY);

  /** @type {string} URL of the SQLite database file */
  let dbUrl = $state(DEFAULT_DB_URL);

  /** @type {string} Optional file size for databases where server doesn't report Content-Length */
  let dbFileSize = $state(String(DEFAULT_DB_SIZE));

  /** @type {Array<Object>|null} Query result rows */
  let result = $state(null);

  /** @type {number|null} Time taken to execute the query in milliseconds */
  let timeTaken = $state(null);

  /** @type {number|null} Total bytes read from the database */
  let bytesRead = $state(null);

  /** @type {boolean} Whether a query is currently being executed */
  let querying = $state(false);

  /** @type {boolean} Whether an error occurred during query execution */
  let error = $state(false);

  /** @type {string} Error message if an error occurred */
  let errorMessage = $state("");

  /** @type {Blob|null} JSON blob of the query results for download */
  let jsonFile = $state(null);

  /** @type {number|null} Total size of the database file */
  let totalBytes = $state(null);

  /** @type {number|null} Total number of HTTP requests made */
  let totalRequests = $state(null);

  // ============================================================================
  // Derived State
  // ============================================================================

  /**
   * Column names extracted from the first result row.
   * @type {Array<string>}
   */
  const columns = $derived(
    result && result.length > 0 ? Object.keys(result[0]) : []
  );

  // ============================================================================
  // Functions
  // ============================================================================

  /**
   * Highlights SQL code using Prism.js syntax highlighter.
   * Used by CodeJar for syntax highlighting in the editor.
   *
   * @param {HTMLElement} editor - The editor DOM element
   */
  function highlight(editor) {
    const code = editor.textContent || "";
    editor.innerHTML = Prism.highlight(code, Prism.languages.sql, "sql");
  }

  /**
   * Svelte action to initialize CodeJar editor on a DOM element.
   * Provides SQL syntax highlighting and editing capabilities.
   *
   * @param {HTMLElement} node - The DOM element to attach CodeJar to
   * @returns {{destroy: () => void}} Cleanup function for Svelte action
   */
  function codejarAction(node) {
    const jar = CodeJar(node, highlight, { tab: "  " });
    jar.updateCode(sqlQuery);
    jar.onUpdate((code) => {
      sqlQuery = code;
    });
    return {
      destroy() {
        jar.destroy();
      },
    };
  }

  /**
   * Creates a database worker and executes the SQL query.
   * Uses sql.js-httpvfs to query the remote database via HTTP range requests.
   *
   * @async
   * @returns {Promise<{result: Array<Object>, bytesRead: number, stats: {totalRequests: number, totalBytes: number}}>}
   *   Query results and statistics
   * @throws {Error} If the database connection or query fails
   */
  async function queryDb() {
    const config = {
      serverMode: "full",
      url: dbUrl,
      requestChunkSize: Number(pageSize),
    };

    // Add file size if specified (required for servers that don't return Content-Length)
    const fileSizeNum = Number(dbFileSize);
    if (fileSizeNum > 0) {
      config.fileSize = fileSizeNum;
    }

    const worker = await createDbWorker(
      [
        {
          from: "inline",
          config,
        },
      ],
      workerUrl.toString(),
      wasmUrl.toString()
    );

    const queryResult = await worker.db.query(sqlQuery);
    const bytes = await worker.worker.bytesRead;
    const stats = await worker.worker.getStats();

    return { result: queryResult, bytesRead: bytes, stats };
  }

  /**
   * Handles the "Run Query" button click.
   * Executes the SQL query and updates the UI with results or errors.
   *
   * @async
   */
  async function runQuery() {
    // Reset state
    result = null;
    querying = true;
    error = false;
    errorMessage = "";

    // Time the query execution
    const queryData = pTime(queryDb)();

    try {
      const data = await queryData;

      // Update state with results
      result = data.result;
      timeTaken = queryData.time;
      bytesRead = data.bytesRead;
      totalRequests = data.stats.totalRequests;
      totalBytes = data.stats.totalBytes;

      // Create JSON blob for download
      jsonFile = new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json",
      });
    } catch (err) {
      error = true;
      errorMessage = err.message || "An unknown error occurred";
      console.error("Query Error:", err);
      jsonFile = null;
    } finally {
      querying = false;
    }
  }

  /**
   * Downloads the query results as a JSON file.
   */
  function downloadJson() {
    if (jsonFile) {
      saveAs(jsonFile, "result.json");
    }
  }

  /**
   * Downloads the query results as a CSV file.
   * Uses PapaParse to convert the result array to CSV format.
   */
  function downloadCsv() {
    if (result) {
      const csv = PapaParse.unparse(result);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      saveAs(blob, "result.csv");
    }
  }
</script>

<!-- Main Application -->
<main class="min-h-screen pt-8 pb-12 lg:pt-12 lg:pb-12 bg-white dark:bg-gray-900">
  <div class="px-4 mx-auto max-w-screen-xl">

    <!-- Header Section -->
    <header class="p-8">
      <Heading tag="h1" class="text-4xl font-extrabold text-gray-900 dark:text-white">
        sql.js-httpvfs Playground
      </Heading>
      <P class="my-4 text-gray-500 dark:text-gray-400">
        <code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">sql.js-httpvfs</code>
        is a fork of and wrapper around sql.js to provide a read-only HTTP-Range-request
        based virtual file system for SQLite. It allows hosting an SQLite database on a
        static file hoster and querying that database from the browser without fully
        downloading it.
      </P>
      <P class="mb-4 text-gray-700 dark:text-gray-300">
        Provide the URL of any SQLite database file and edit the default SQL Query.
      </P>
      <A
        href="https://github.com/phiresky/sql.js-httpvfs"
        class="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline font-medium"
      >
        Learn more about sql.js-httpvfs
        <svg
          class="ml-1 w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </A>
    </header>

    <!-- Configuration Section -->
    <section class="p-6" aria-label="Database Configuration">
      <Label class="space-y-2">
        <span class="text-gray-900 dark:text-white font-medium">SQLite Database URL</span>
        <Input
          type="url"
          placeholder="https://example.com/database.db"
          size="md"
          bind:value={dbUrl}
        />
      </Label>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Label class="space-y-2">
          <span class="text-gray-900 dark:text-white font-medium">File Size (bytes)</span>
          <Input
            type="number"
            placeholder="Required if server doesn't report size"
            size="md"
            bind:value={dbFileSize}
          />
          <span class="text-xs text-gray-500 dark:text-gray-400">Required for GitHub Pages and some CDNs</span>
        </Label>
        <Label class="space-y-2">
          <span class="text-gray-900 dark:text-white font-medium">Request Chunk Size</span>
          <Select class="mt-2" items={PAGE_SIZE_OPTIONS} bind:value={pageSize} />
        </Label>
      </div>
    </section>

    <!-- Query Editor Section -->
    <section class="p-6" aria-label="SQL Query Editor">
      <Label class="space-y-2">
        <span class="text-gray-900 dark:text-white font-medium">SQL Query</span>
        <div
          use:codejarAction
          class="editor border border-gray-300 dark:border-gray-600 rounded-lg p-3 font-mono text-sm bg-gray-50 dark:bg-gray-800 dark:text-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary-500"
          role="textbox"
          aria-label="SQL query editor"
          tabindex="0"
        ></div>
      </Label>
    </section>

    <!-- Run Query Button -->
    <section class="p-6">
      <Button color="blue" onclick={runQuery} disabled={querying} size="lg">
        {#if querying}
          <Spinner class="mr-2" size="4" color="white" />
          Executing Query...
        {:else}
          <Play class="w-5 h-5 mr-2" />
          Run Query
        {/if}
      </Button>
    </section>

    <!-- Results Section -->
    {#if result}
      <!-- Query Statistics -->
      {#if timeTaken !== null}
        <section class="p-6" aria-label="Query Statistics">
          <Alert color="green">
            <span class="font-medium">Query completed successfully!</span>
            <br />
            Executed in <span class="font-semibold">{timeTaken.toFixed(0)} ms</span>,
            read <span class="font-semibold">{prettyBytes(bytesRead)}</span>
            via <span class="font-semibold">{totalRequests} HTTP {pluralize("request", totalRequests)}</span>
            from a <span class="font-semibold">{prettyBytes(totalBytes)}</span> database.
            <br />
            Returned <span class="font-semibold">{pluralize("row", result.length, true)}</span>
            ({prettyBytes(jsonFile?.size || 0)} as JSON).
          </Alert>
        </section>
      {/if}

      <!-- Results Table -->
      <section class="p-6" aria-label="Query Results">
        <div class="overflow-x-auto">
          <Table striped hoverable shadow>
            <TableHead>
              {#each columns as col}
                <TableHeadCell>{col}</TableHeadCell>
              {/each}
            </TableHead>
            <TableBody>
              {#each result as row}
                <TableBodyRow>
                  {#each columns as col}
                    <TableBodyCell>{row[col] ?? ""}</TableBodyCell>
                  {/each}
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      </section>

      <!-- Export Buttons -->
      <section class="p-6" aria-label="Export Options">
        <ButtonGroup>
          <Button color="light" onclick={downloadJson}>
            <FileJson2 class="w-4 h-4 mr-2" />
            Download JSON
          </Button>
          <Button color="light" onclick={downloadCsv}>
            <Sheet class="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        </ButtonGroup>
      </section>
    {/if}

    <!-- Error Display -->
    {#if error}
      <section class="p-6" aria-label="Error Message">
        <Alert color="red">
          <span class="font-medium">Query Error:</span>
          {errorMessage}
        </Alert>
      </section>
    {/if}
  </div>
</main>

<!-- External Styles -->
<svelte:head>
  <link
    href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css"
    rel="stylesheet"
  />
</svelte:head>

<style>
  /**
   * CodeJar editor styling
   * Ensures proper text wrapping and formatting for SQL code
   */
  .editor {
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>
