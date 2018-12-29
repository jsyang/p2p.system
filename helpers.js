let params;

export function getQuerystringParams() {
    if (!params) {
        const dictionary = {};
        location.search.slice(1).split('&').forEach(kv => {
            const keyvalue          = kv.split('=');
            dictionary[keyvalue[0]] = keyvalue[1];
        });

        params = dictionary;
    }

    return params;
}
