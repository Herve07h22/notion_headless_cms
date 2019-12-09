import fetch from "isomorphic-unfetch";

//const PAGE_ID = "1a86e7f6-d6a5-4537-a2e5-15650c1888b8";
const PAGE_ID = "e256cc68-cdba-4aea-b92a-5c12c3223052";

// https://www.notion.so/camilab/Un-nouvel-article-de-blog-e256cc68cdba4aeab92a5c12c3223052



export default async function getNotionData() {
  const data    = await loadPageChunk({ pageId: PAGE_ID });
  const blocks  = data.recordMap.block;

  const mainBlock     = blocks[PAGE_ID]

  const childBlocks   = mainBlock.value.content
  const titreArticle  = mainBlock.value.properties.title[0]
  const dateEdition   = mainBlock.value.last_edited_time

  let article = {titre:titreArticle, date:dateEdition, contenu:[] };

  const genereContenu = (blocCourant, autresBlocs, listeItems) => {
    let retour = null
    let liste  = listeitems ? listeitems.slice(0) : []

    switch(blocCourant.type) {
      case "header" :
      case "sub_header" :
      case "text" :
        retour = { type: blocCourant.type, value: value.properties.title }
        break;
      case "code" :
        retour = { type: blocCourant.type, value: value.properties.title, language : value.properties.language }
        break;
      case "bulleted_list" :
        // Si le prochain block est encore un bullet, on se contente de compléter la liste
        if (autresBlocs && autresBlocs.length && autresBlocs[0].type === "bulleted_list") {
          liste.push(value.properties.title)
        } else {
          retour = { type: blocCourant.type, value: [value.properties.title, ...listeItems ] }
        }
    }

    if (autresBlocs && autresBlocs.length) {
      return [ retour, ...genereContenu(autresBlocs[0], autresBlocs.slice(1)), liste ]
    } else {
      return [ retour ]
    }

  }

  for (const block of childBlocks) {
    const value = blocks[block].value;
    console.log("Processing block :", value)

    /* On ne traite pas les cas des sous-articles
    if (
      value.type === "page" ||
      value.type === "header" ||
      value.type === "sub_header"
    ) {
      sections.push({ title: value.properties.title, children: [] });
      continue;
    }
    */

    // const section = sections[sections.length - 1];
  
    let listeCourante = null;

    switch(value.type) {
      case "header" :   value.properties && article.contenu.push({ type: "header", value: value.properties.title })
                      listeCourante = null
                      break;
      
      case "sub_header" :   value.properties && article.contenu.push({ type: "sub_header", value: value.properties.title })
                      listeCourante = null
                      break;

      case "image" :  article.contenu.push({ type: "image", src: `/image.js?url=${encodeURIComponent(value.format.display_source)}` }  )
                      listeCourante = null
                      break;

      case "text" :   value.properties && article.contenu.push({ type: "text", value: value.properties.title })
                      listeCourante = null
                      break;

      case "code" :   value.properties && article.contenu.push({ type: "code", value: value.properties.title, language : value.properties.language })
                      listeCourante = null
                      break;

      case "bulleted_list" :   if (listeCourante == null) {
                        // C'est le premier élément de la liste
                        listeCourante = [ value.properties.title ]
                        article.contenu.push({ type: "bulleted_list", value: listeCourante })
                      } else {
                        listeCourante = [ ...liste, value.properties.title ]
                      }
                      break;
      default :       listeCourante = null
                      console.log("Block non géré")
    }
  }
  console.log("article : ", article)
  return { article };
}

async function rpc(fnName, body = {}) {
  const res = await fetch(`https://www.notion.so/api/v3/${fnName}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    return res.json();
  } else {
    throw new Error(await getError(res));
  }
}

async function getError(res) {
  return `Notion API error (${res.status}) \n${getJSONHeaders(
    res
  )}\n ${await getBodyOrNull(res)}`;
}

function getJSONHeaders(res) {
  return JSON.stringify(res.headers.raw());
}

function getBodyOrNull(res) {
  try {
    return res.text();
  } catch (err) {
    return null;
  }
}

/*
function queryCollection({
  collectionId,
  collectionViewId,
  loader = {},
  query = {}
}) {
  const {
    limit = 70,
    loadContentCover = true,
    type = "table",
    userLocale = "en",
    userTimeZone = "America/Los_Angeles"
  } = loader;

  const {
    aggregate = [
      {
        aggregation_type: "count",
        id: "count",
        property: "title",
        type: "title",
        view_type: "table"
      }
    ],
    filter = [],
    filter_operator = "and",
    sort = []
  } = query;

  return rpc("queryCollection", {
    collectionId,
    collectionViewId,
    loader: {
      limit,
      loadContentCover,
      type,
      userLocale,
      userTimeZone
    },
    query: {
      aggregate,
      filter,
      filter_operator,
      sort
    }
  });
}
*/

function loadPageChunk({
  pageId,
  limit = 100,
  cursor = { stack: [] },
  chunkNumber = 0,
  verticalColumns = false
}) {
  return rpc("loadPageChunk", {
    pageId,
    limit,
    cursor,
    chunkNumber,
    verticalColumns
  });
}

/*
function values(obj) {
  const vals = [];
  for (const key in obj) {
    vals.push(obj[key]);
  }
  return vals;
}
*/