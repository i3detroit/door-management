<script>
    import { untrack } from 'svelte';
    import {
        remoteOpenDoor,
        remoteRebootDoor,
        remoteSetAccess
    } from "./actions.remote";
    import { source } from 'sveltekit-sse';

    let { data } = $props();
    
    let running = $state(false);
    let selectedDoor = $state();

    const logStream = source('/api/logs').select('line').json();
    let logHistory = $state([]);

    $effect(() => {
        if (!$logStream) { return; }
        const line = `${ $logStream.timestamp }: ${ $logStream.body }\n`;
        untrack(() => logHistory.unshift(line));
    });
</script>

<h1>Door Management</h1>

<h2>Status</h2>
<span>{ running ? 'Running' : 'Ready' }</span>
<a
    href="/logout"
    data-sveltekit-preload-data="tap"
>
    Logout
</a>

<h2>Actions</h2>
<select bind:value={selectedDoor}>?
    <option value="">
        All Doors
    </option>
    {#each data.doors as door}
        <option>{door}</option>
    {/each}
</select>
<button
    onclick={() => remoteSetAccess(selectedDoor).run() }
    disabled={running}
>
    Update
</button>
<button
    onclick={() => remoteOpenDoor(selectedDoor).run() }
    disabled={running}
>
    Open
</button>
<button
    onclick={() => remoteRebootDoor(selectedDoor).run() }
    disabled={running}
>
    Reboot
</button>

<h2>Logs</h2>
<output>
    {#each logHistory as logLine}
        <div>{logLine}</div>
    {/each}
</output>

<style>
    output {
        font-family: monospace, sans-serif;
        color: light-dark(black, white);
        background-color: light-dark(#fff, #2b2a33);
        border: 1px solid light-dark(#c7c7ce, #5d5c68);
        padding: 0.75em;
        width: 100%;
        height: 350px;
        display: flex;
        flex-direction: column-reverse;
        overflow-y: scroll;
    }
</style>