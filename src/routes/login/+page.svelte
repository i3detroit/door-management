<script>
    import { authClient } from "$lib/helpers/authClient.js";

    let form = $state({});

    const handleSubmit = async (event) => {
        event.preventDefault();

        const { email, password } =
            Object.fromEntries(new FormData(event.target));

        const { error } = await authClient.signIn.email({
            email, password, callbackURL: '/'
        });

        if (error) { form.error = error; }
    };
</script>

<h1>Login</h1>

{#if form.error}
    <p>{form.error.message}</p>
{/if}

<form onsubmit={handleSubmit}>
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
        <button type="submit">
            Login
        </button>
    </div>
</form>
