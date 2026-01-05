export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Agar fayl kengaytmasi bo'lsa (css, js, png, etc), to'g'ridan-to'g'ri qaytarish
        if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
            return env.ASSETS.fetch(request);
        }

        // Aks holda index.html ni qaytarish (SPA routing uchun)
        const indexUrl = new URL('/index.html', request.url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
    }
};