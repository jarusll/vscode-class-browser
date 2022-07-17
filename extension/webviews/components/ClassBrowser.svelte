<script lang="ts">
    import { onMount } from "svelte";

    let classResults: Set<any> = new Set()
    let searchQuery = ""

    onMount(async () => {
        // this is used to recieve message from sidebar provider
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "class-result": {
                    // classResults = message.value
                    // console.log("searched result:", message.value)
                    message.value.forEach((element: any) => {
                        console.log("single :", message.value)
                        classResults.add(element) 
                    });
                    break;
                }
                case "partial-class-result": {
                    // classResults = message.value
                    console.log("partial :", message.value)
                    message.value.forEach((element: any) => {
                        classResults.add(element) 
                    });
                    // classResults = classResults.concat(message.value)
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

</script>

<div class="main">
<input bind:value={searchQuery} on:input={() => searchClass(searchQuery)} class="query-input"/>
<div class="browse">
<ul class="class-browse">
	{#each Array.from(classResults.values()) as result}
		<li>
            <button class="symbol" on:click={() => {
                console.log(result)
                // searchMethod(result.location.uri.path)
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
    /* .browse {
        height: 80vh;
    }
    .class-browse {
        max-height: 40vh;
    }
    .method-browse {
        max-height: 40vh;
    } */
</style>