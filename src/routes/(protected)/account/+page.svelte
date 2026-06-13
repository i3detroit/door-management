<script>
    import { authClient } from "$lib/helpers/authClient.js";
    import { goto } from "$app/navigation";

    const { data } = $props();
    let form = $state({});

    const handleSubmit = async (event) => {
        event.preventDefault();

        const { currentPassword, newPassword } =
            Object.fromEntries(new FormData(event.target));

        const { error } = await authClient.changePassword({
            currentPassword, newPassword, revokeOtherSessions: true
        });

        if (error) { form.error = error; }
        else { goto('/'); }
    };
</script>

<h1>Account</h1>

<h2>User Information</h2>
<form>
    <div class="input-row">
        <label for="email">
            Full Name
        </label>
        <input
            id="name"
            type="text"
            name="name"
            value={data.user.name}
            disabled
        />
    </div>
    <div class="input-row">
        <label for="newPassword">
            Email Address
        </label>
        <input
            id="email"
            type="email"
            name="email"
            value={data.user.email}
            disabled
        />
    </div>
</form>

<h2>Change Password</h2>
{#if form.error}
    <p>{form.error.message}</p>
{/if}

<form onsubmit={handleSubmit}>
    <div class="input-row">
        <label for="currentPassword">
            Current Password
        </label>
        <input
            id="currentPassword"
            type="password"
            name="currentPassword"
            autocomplete="current-password"
            required
        />
    </div>
    <div class="input-row">
        <label for="newPassword">
            New Password
        </label>
        <input
            id="newPassword"
            type="password"
            name="newPassword"
            autocomplete="new-password"
            minlength="8"
            required
        />
    </div>
    <div class="input-row">
        <button type="submit">
            Submit
        </button>
    </div>
</form>