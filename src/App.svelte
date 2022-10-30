<script>
  import { Button } from "flowbite-svelte";
  import { Spinner, Alert } from "flowbite-svelte";
  import { Heading, P, A } from "flowbite-svelte";
  import { Select, Input, Label, Helper } from "flowbite-svelte";
  let pageSize = "1024";
  let pageSizes = [
    { value: "512", name: "512" },
    { value: "1024", name: "1024" },
    { value: "2048", name: "2048" },
    { value: "4096", name: "4096" },
    { value: "8192", name: "8192" },
    { value: "16384", name: "16384" },
    { value: "32768", name: "32768" },
  ];

  import { createDbWorker } from "sql.js-httpvfs";
  import { PowerTable } from "@muonw/powertable";
  import pTime from "p-time";

  import { CodeJar } from "@novacbn/svelte-codejar";
  let sqlQuery = `SELECT * from titles WHERE title_id LIKE "tt00000%";`;
  let dbUrl =
    "https://nishad.github.io/sql.js-httpvfs-playground/db/imdb-titles-100000_1024_indexed.db";
  import Prism from "prismjs";
  import "prismjs/components/prism-sql";

  const highlight = (code, syntax) =>
    Prism.highlight(code, Prism.languages[syntax], syntax);

  const workerUrl = new URL(
    "sql.js-httpvfs/dist/sqlite.worker.js",
    import.meta.url
  );
  const wasmUrl = new URL("sql.js-httpvfs/dist/sql-wasm.wasm", import.meta.url);

  let ptOptions = {
    footerText: false,
    footerFilters: false,
    headerText: true,
    headerFilters: false,
  };

  async function queryDb() {
    const worker = await createDbWorker(
      [
        {
          from: "inline",
          config: {
            serverMode: "full",
            url: dbUrl,
            requestChunkSize: Number(pageSize),
          },
        },
      ],
      workerUrl.toString(),
      wasmUrl.toString()
    );
    const result = await worker.db.query(sqlQuery);
    return result;
  }

  let result;
  let timeTaken;

  async function runQuery() {
    result = pTime(queryDb)();
    await result;
    timeTaken = result.time;
  }
</script>

<main class="pt-8 pb-16 lg:pt-16 lg:pb-24 bg-white">
  <div class=" px-4 mx-auto max-w-screen-xl">
    <div class="p-8">
      <Heading tag="h2" customeSize="text-4xl font-extrabold "
        >sql.js-httpvfs Playground</Heading
      >
      <P class="my-4 text-gray-500">
        <code>sql.js-httpvfs</code> is a fork of and wrapper around sql.js to provide
        a read-only HTTP-Range-request based virtual file system for SQLite. It allows
        hosting an SQLite database on a static file hoster and querying that database
        from the browser without fully downloading it.</P
      >
      <P class="mb-4"
        >Provide the URL of any SQLite database file and edit the default SQL
        Query.</P
      >
      <A href="https://github.com/phiresky/sql.js-httpvfs"
        >Read more
        <svg
          class="ml-1 w-6 h-6"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          /></svg
        >
      </A>
    </div>

    <div class="p-8">
      <Label class="space-y-2">
        <span>SQLite DB file URL</span>
        <Input type="url" placeholder="" size="md" bind:value={dbUrl} />
      </Label>
      <Label class="space-y-2"
        >Select page size
        <Select class="mt-2" items={pageSizes} bind:value={pageSize} />
      </Label>
    </div>
    <div class="p-8">
      <Label class="space-y-2">
        <span>Edit SQL Qery</span>
        <CodeJar bind:value={sqlQuery} syntax="sql" {highlight} />
      </Label>
    </div>
    <div class="p-8">
      <Button on:click={runQuery}>Query Database</Button>
    </div>
    {#await result}
      <div class="p-8">
        <Spinner />
        <p>Querying</p>
      </div>
    {:then data}
      {#if data}
        {#if timeTaken}
          <div class="p-8 mt-2">
            <Alert>
              Query took <span class="font-medium">{timeTaken}</span> ms
            </Alert>
          </div>
        {/if}
        <div class="p-8">
          <div class="MuonW PowerTable">
            <PowerTable ptData={data} {ptOptions} />
          </div>
        </div>
      {/if}
    {:catch error}
      <p style="color: red">{error.message}</p>
    {/await}
  </div>
</main>

<svelte:head>
  <link
    href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.22.0/themes/prism.min.css"
    rel="stylesheet"
  />
</svelte:head>
