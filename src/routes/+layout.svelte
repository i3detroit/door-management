<script>
	import '../styles/reset.css';
	import '../styles/style.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Door Management</title>
</svelte:head>

<div class="container">
	{@render children()}
</div>

<style>
	.container {
		max-width: 800px;
		margin-inline: auto;
	}
</style>