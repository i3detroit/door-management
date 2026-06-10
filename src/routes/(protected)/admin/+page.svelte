<script>
    import { authClient } from "$lib/helpers/authClient.js";
    import { invalidateAll } from "$app/navigation";

    const { data } = $props();

    const handleSubmitCreate = async (event) => {
        event.preventDefault();

        const { email, password, name, admin } =
            Object.fromEntries(new FormData(event.target));
        const role = admin ? 'admin' : undefined;

        await authClient.admin.createUser({
            email, password, name, role
        });
        invalidateAll();
    };

    const handleSubmitDelete = async (event) => {
        event.preventDefault();

        const { userId } = Object.fromEntries(new FormData(event.target));

        await authClient.admin.removeUser({ userId });
        invalidateAll();
    }
</script>

<h1>Admin</h1>

<h2>Create User</h2>
<form onsubmit={handleSubmitCreate}>
    <div class="input-row">
        <label for="email">
            Email
        </label>
        <input
            id="email"
            type="email"
            name="email"
            required
        />
    </div>
    <div class="input-row">
        <label for="password">
            Password
        </label>
        <input
            id="password"
            type="password"
            name="password"
            minlength="8"
            required
        />
    </div>
    <div class="input-row">
        <label for="name">
            Name
        </label>
        <input
            id="name"
            type="text"
            name="name"
            required
        />
    </div>
    <div class="input-row">
        <label for="admin">
            Admin
        </label>
        <input
            id="admin"
            type="checkbox"
            name="admin"
        />
    </div>
    <div class="input-row">
        <button type="submit">
            Create
        </button>
    </div>
</form>

<h2>Delete User</h2>
<form onsubmit={handleSubmitDelete}>
    <div class="input-row">
        <label for="userId">
            User ID
        </label>
        <input
            type="text"
            name="userId"
            id="userId"
            required
        />
    </div>
    <div class="input-row">
        <button type="submit">
            Delete
        </button>
    </div>
</form>

<h2>Current Users</h2>
<ul>
    {#each data.users as user}
        <li><code>{ JSON.stringify(user) }</code></li>
    {/each}
</ul>