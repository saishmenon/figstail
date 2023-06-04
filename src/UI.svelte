<script>
    import "./UI.css";

    import FigmaLogo from "./assets/figma-logo.svelte";
    import SvelteLogo from "./assets/svelte-logo.svelte";
    import TailwindcssLogo from "./assets/tailwindcss-logo.svelte";
</script>

<main class="flex flex-col h-screen justify-center items-center p-4">
    <div class="flex flex-col items-center">
        <h1 class="text-2xl font-bold mb-3 text-gray-700">Figstail</h1>
        <div class="flex">
            <div class="mr-2"><SvelteLogo /></div>
            <p class="mr-2">+</p>
            <div class="mr-2"><TailwindcssLogo /></div>
            <p class="mr-2">+</p>
            <div><FigmaLogo /></div>
        </div>
        <p class="mt-4 text-xs text-gray-600 text-center">
            A boilerplate temple for building Figma plugins with Svelte and
            Tailwindcss.
        </p>

        <p class="mt-6 text-xs text-gray-400 text-center">
            Let me know what you build with this.
        </p>
    </div>
</main>
