// handler for automated redeployments
addEventListener('scheduled', event => {
  event.waitUntil(
    handleSchedule(event.scheduledTime)
  )
})
async function handleSchedule(scheduledDate) {
  return fetch("https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/73d95584-d7cf-44de-95b3-7f2788fee456",
    {method: "POST"}
  )
}

// handler for GET and POST requests
addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method === "POST") {
    return event.respondWith(
      handlePOST(event.request).catch(
        (err) => new Response(err.stack, { status: 500 })
      )
    );
  }
  else if (request.method === "GET") {
    return event.respondWith(
      handleGET(event.request).catch(
        (err) => new Response(err.stack, { status: 500 })
      )
    );
  }
});

async function handlePOST(request){
  const { pathname } = new URL(request.url);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-type': 'application/json'
  };

  // set data for single brewery from Workers KV
  if (pathname.startsWith("/brewery")) {
    const brewery = pathname.split("/")[2];
    const data = JSON.stringify(await request.json())
    await taplist.put(brewery, data)
    return new Response('ok', {headers});
  }

  // handle POSTS to the Untappd API
  if (pathname.startsWith("/untappd")) {
    var url = new URL(request.url);
    url.hostname = "untappd.com"
    url.pathname = url.pathname.replace("/untappd", "");
    let response = await fetch(url, request);
    let json = await response.json();
    return new Response(JSON.stringify(json), {headers});
  }
}

async function handleGET(request){
  const { pathname } = new URL(request.url);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-type': 'application/json'
  };

  // get info for a single brewery
  if (pathname.startsWith("/brewery")) {
    const brewery = pathname.split('/')[2];
    const breweryInfo = await taplist.get(brewery);
    if (breweryInfo)
      return new Response(breweryInfo, {headers});
    else
      return new Response(`Brewery name [${brewery}] not found.`, {
        status: 404,
      });
  }

  // get the full taplist
  if (pathname.startsWith("/taplist")) {
    const keys = await taplist.list();
    let list = {};
    for(const key of keys.keys) {
      list[key.name] = JSON.parse(await taplist.get(key.name));
    }
    return new Response(JSON.stringify(list), {headers});
  }

  // get request for the Untappd API
  if (pathname.startsWith("/untappd")) {
    var url = new URL(request.url);
    url.hostname = "untappd.com"
    url.pathname = url.pathname.replace("/untappd", "");
    let response = await fetch(url, request);
    let json = await response.json();
    return new Response(JSON.stringify(json), {headers});
  }

  // paths for loading from Cloudflare Pages
  if (pathname.startsWith("/js") || pathname.startsWith("/css") || pathname.startsWith("/img")) {
    var url = new URL(request.url);
    url.hostname = "taplist.jporter.dev"
    let response = await fetch(url, request);
    return response;
  }

  return new Response('Not Found');
}
