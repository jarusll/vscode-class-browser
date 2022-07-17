<script lang="ts">
import { onMount } from "svelte";

    let classResults: Array<Object> = []
    let searchQuery = ""

    onMount(async () => {
        // this is used to recieve message from sidebar provider
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "class-result": {
                    classResults = message.value
                    console.log(classResults)
                    break;
                }
                case "partial-class-result": {
                    console.log("partial", message.value)
                    // append
                    classResults = classResults.concat(message.value)
                    // remove duplicates
                    classResults = classResults.filter((value: any, index, self) =>
                        index === self.findIndex((t: any) => (
                            t.name === value.name
                        )))
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

    function search(queryAction: {type: String, value: any}) {
        post(queryAction)
    }

    function searchClass(query: String){
        post({type: "search-class", value: query})
    }

    function searchMethod(query: String){
        post({type: "search-method", value: query})
    }

    function open(query: String){
        post({type: "open", value: query})
    }

</script>

<div class="main">
<input bind:value={searchQuery} on:input={() => {
    if (searchQuery === "*" || searchQuery === "") 
        searchClass(searchQuery)
    else if (searchQuery.length > 2) 
        searchClass(searchQuery)
}} class="query-input"/>
<div class="browse">
<ul class="class-browse">
	{#each classResults as result}
		<li>
            <button class="symbol" on:click={() => {
                console.log(result)
                // open(result.location.range[0])
                post({
                    type: "open",
                    value: result.location.uri.path,
                    position: result.location.range[0]
                })
            }}>
                {result.name}
            </button>
        </li>
	{/each}
</ul>
</div>
</div>

<style>
    ul {
        list-style: none;
        display: flex;
        flex-direction: column;
        justify-content: center;
        margin: 0;
        padding: 0;
        overflow-y: scroll;
    }
    .symbol {
        text-align: left;
        background-color: rgb(29, 55, 72);
    }
    .symbol:hover {
        background-color: rgb(59, 125, 168);
    }
</style>