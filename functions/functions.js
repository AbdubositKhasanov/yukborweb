export function onRequest(context) {
    const url = new URL(context.request.url);

    // Static fayllar uchun
    if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/)) {
        return context.next();
    }

    // Barcha boshqa route'lar uchun index.html ni qaytarish
    return context.env.ASSETS.fetch(new Request(new URL('/index.html', context.request.url)));
}