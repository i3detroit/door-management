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
    <label for="email">
        Email
    </label>
    <input
        id="email"
        type="email"
        name="email"
        required
    />
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
    <label for="name">
        Name
    </label>
    <input
        id="name"
        type="text"
        name="name"
        required
    />
    <label for="admin">
        Admin
    </label>
    <input
        id="admin"
        type="checkbox"
        name="admin"
    />
    <button type="submit">
        Create
    </button>
</form>

<h2>Delete User</h2>
<form onsubmit={handleSubmitDelete}>
    <label for="userId">
        User ID
    </label>
    <input
        type="text"
        name="userId"
        id="userId"
        required
    />
    <button type="submit">
        Delete
    </button>
</form>

<h2>Current Users</h2>
<code>{ JSON.stringify(data) }</code>