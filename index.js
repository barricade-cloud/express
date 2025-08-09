const fetch = require('node-fetch');

const filterHeaders = (excludeKeys, originalHeaders) => {
    const filteredHeaders = {};
    for (const [key, value] of Object.entries(originalHeaders)) {
        if (excludeKeys.includes(key)) {
            continue;
        }
        filteredHeaders[key] = value;
    }
    return filteredHeaders;
};

const filterBody = (excludeKeys, originalBody) => {
    const filteredBody = {};
    for (const [key, value] of Object.entries(originalBody)) {
        if (excludeKeys.includes(key)) {
            continue;
        }
        filteredBody[key] = value;
    }
    return filteredBody;
};

const main = (options = {}) => {
    return async(req, res, next) => {
        const controller = new AbortController();
        let timeout;

        let filteredHeaders = {};
        if (options.excludeKeys && options.excludeKeys.headers && options.excludeKeys.headers.length > 0) {
            filteredHeaders = filterHeaders(options.excludeKeys.headers, req.headers);
        } else {
            filteredHeaders = req.headers;
        }

        let filteredBody = {};
        if (req.body && options.excludeKeys && options.excludeKeys.body && options.excludeKeys.body.length > 0) {
            filteredBody = filterBody(options.excludeKeys.body, req.body);
        } else {
            filteredBody = req.body;
        }

        const payload = {
            method: req.method,
            url: req.url,
            headers: filteredHeaders,
            body: filteredBody
        };
        timeout = setTimeout(() => controller.abort(), options.timeout || 100);
        try {
            const response = await fetch('https://waf.barricade.cloud/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            if (!response.ok) {
                return next();
            }

            const data = await response.json();
            const { action, requestID } = data;
            if (action == 'block') {
                const stop = `<!DOCTYPE html><html><head> <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"></head> <body class="text-start my-5 pt-5 bg-light lh-lg"> <div class="w-50 mx-auto"> <i class="bi bi-sign-stop-fill fs-1 mb-5 d-block text-danger"></i> <h1 class="fw-bold">Access Denied</h1> <p>Your request was blocked by the site's firewall.</p> <p class="text-muted small">If you believe the request was blocked by error, please contact the site administrator with the following information:</p> <p class="text-muted small"> <strong>Request ID:</strong> <code class="px-2">${requestID}</code> </p> </div> </body></html>`;
                return res.status(403).send(stop);
            }
            next();
        } catch (e) {
            if (e.name != 'AbortError') {
                console.error(e);
            }
            return next();
        } finally {
            clearTimeout(timeout);
        }
    };
};

module.exports = main;
