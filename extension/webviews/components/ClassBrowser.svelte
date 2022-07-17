<script lang="ts">
    import { onMount } from "svelte";

    let result: Array<any> = []
    let search = ""

    onMount(async () => {
        // this is used to recieve message from sidebar provider
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
            }
        });

        // this is used to send message to provider
        // tsvscode.postMessage({ type: "get-token", value: undefined });
    });
    function post(message: {type: string, value: string}) {
        tsvscode.postMessage(message);
    }
</script>

<h2>
ClassBrowser

<input bind:value={search}/>
<div>{JSON.stringify(result)}</div>
<button on:click={() => post({type: "hello", value: "world"})}>Fetch</button>
</h2>