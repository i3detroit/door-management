<script>
    import { remoteSetAccess } from "./actions.remote";
    
    let running = $state(false);

    const requestSetAccess = async () => {
        try {
            running = true;
            await remoteSetAccess();
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
    onclick={requestSetAccess}
    disabled={running}
>
    Set Access
</button>