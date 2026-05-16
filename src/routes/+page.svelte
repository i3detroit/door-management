<script>
    import {
        remoteOpenDoor,
        remoteRebootDoor,
        remoteSetAccess
    } from "./actions.remote";

    let { data } = $props();
    
    let running = $state(false);
    let selectedDoor = $state();

    const remoteFnHandler = fn => async () => {
        try {
            running = true;
            await fn(selectedDoor);
        } catch (error) {
            console.error(error);
        } finally {
            running = false;
        }
    };
</script>

<h1>Door Management</h1>
<span>{ running ? 'Running' : 'Ready' }</span>
<button
    onclick={remoteFnHandler(remoteSetAccess)}
    disabled={running}
>
    Update All
</button>
<hr />
<select bind:value={selectedDoor}>
    {#each data.doors as door}
        <option>{door}</option>
    {/each}
</select>
<button
    onclick={remoteFnHandler(remoteOpenDoor)}
    disabled={running}
>
    Open Door
</button>
<button
    onclick={remoteFnHandler(remoteRebootDoor)}
    disabled={running}
>
    Reboot Door
</button>