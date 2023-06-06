<script>
    // Importing styles
    import "./UI.css";

    // Importing components example
    import Logos from "./components/Logos.svelte";
    import Footer from "./components/Footer.svelte";
</script>

<main class="flex flex-col h-screen justify-center items-center p-4">
    <div class="flex flex-col items-center">
        <h1 class="text-2xl font-bold mb-4 text-gray-700">Figstail</h1>
        <p class="mb-4 text-sm text-gray-600 text-center">
            A boilerplate temple for building Figma plugins with Svelte and
            Tailwindcss.
        </p>
        <Logos />
        <Footer />
    </div>
</main>
