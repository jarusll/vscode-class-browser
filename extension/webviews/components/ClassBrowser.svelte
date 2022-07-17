<script lang="ts">
    import { onMount } from "svelte";

    let results: Array<any> = []
    let searchQuery = ""

    onMount(async () => {
        // this is used to recieve message from sidebar provider
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "result": {
                    results = message.value
                    break;
                }
            }
        });

        // this is used to send message to provider
        // tsvscode.postMessage({ type: "get-token", value: undefined });
    });

    function post(message: {type: String, value: String}) {
        tsvscode.postMessage(message);
    }

    function search(query: String){
        post({type: "search", value: query})
    }

</script>

<div class="main">
<h2>
ClassBrowser
<input bind:value={searchQuery}/>
<button on:click={() => search(searchQuery)}>Fetch</button>
<ul>
	{#each results as result}
		<li>
			{result.name}
        </li>
	{/each}
</ul>
</h2>
</div>

<style>
    .main {
        font-size: 10px;
        /* background-color: red;
        color: white; */
    }
</style>