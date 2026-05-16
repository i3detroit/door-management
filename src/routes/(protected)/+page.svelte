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
<a
    href="/logout"
    data-sveltekit-preload-data="tap"
>
    Logout
</a>

<span>{ running ? 'Running' : 'Ready' }</span>

<select bind:value={selectedDoor}>?
    <option value="">
        All Doors
    </option>
    {#each data.doors as door}
        <option>{door}</option>
    {/each}
</select>
<button
    onclick={remoteFnHandler(remoteSetAccess)}
    disabled={running}
>
    Update
</button>
<button
    onclick={remoteFnHandler(remoteOpenDoor)}
    disabled={running}
>
    Open
</button>
<button
    onclick={remoteFnHandler(remoteRebootDoor)}
    disabled={running}
>
    Reboot
</button>