<script>
	let { children } = $props();
</script>

<svelte:head>
	<title>i3Detroit | Door Management</title>
</svelte:head>

{@render children()}

<style>
	:root {
		color-scheme: dark light;
	}
</style>