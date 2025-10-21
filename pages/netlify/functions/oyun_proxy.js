exports.handler = async (event) => {
  // 1. Kullanıcının istediği asıl oyun URL'sini al
  const targetUrl = event.queryStringParameters.url;

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: '<html><body><h1>Hata: Lütfen bir oyun URL\'si belirtin.</h1></body></html>',
    };
  }

  try {
    // 2. Basit bir HTML sayfası oluşturarak oyunu iframe içinde yükle
    // Bu yöntem, github.io engellerini aşmak için daha etkili olabilir
    const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Oyun Yükleniyor</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body, html {
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
                background-color: #000;
            }
            iframe {
                width: 100%;
                height: 100vh;
                border: none;
            }
        </style>
    </head>
    <body>
        <iframe src="${targetUrl}" allowfullscreen allow="autoplay; fullscreen"></iframe>
    </body>
    </html>
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
      },
      body: htmlResponse,
    };
  } catch (error) {
    console.error('Proxy Hatası:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: `<html><body><h1>Proxy hatası: ${error.message}</h1></body></html>`,
    };
  }
};