import fetch from "isomorphic-unfetch";

const PAGE_ID = "e256cc68-cdba-4aea-b92a-5c12c3223052";

export default async function getNotionData() {
  const data = await loadPageChunk({ pageId: PAGE_ID });
  //const blocks = values(data.recordMap.block);
  const blocks  = data.recordMap.block;

  const mainBlock     = blocks[PAGE_ID]

  const childBlocks   = mainBlock.value.content.map(b => blocks[b])
  const titreArticle  = mainBlock.value.properties.title[0]
  const dateEdition   = mainBlock.value.last_edited_time

  const sections = [{ title: [titreArticle], children: [] }];
  let meta = {title:titreArticle, date:dateEdition};

  let currentSection = null;
  let image_url = "";

  for (const block of childBlocks) {
    const value = block.value;

    if (
      value.type === "page" ||
      value.type === "header" ||
      value.type === "sub_header"
    ) {
      sections.push({ title: value.properties.title, children: [] });
      continue;
    }

    const section = sections[sections.length - 1];
    let list = null;

    if (value.type === "image") {
      list = null;
      image_url = value.format.display_source;
      const child = {
        type: "image",
        //src: `/image.js?url=${encodeURIComponent(value.format.display_source)}`
        src: image_url.startsWith('https://s3-us-west-2.amazonaws.com/secure.notion-static.com') ?
        `https://www.notion.so/image/${encodeURIComponent(image_url)}` : image_url
      };
      section.children.push(child);
    } else if (value.type === "text") {
      list = null;
      if (value.properties) {
        section.children.push({
          type: "text",
          value: value.properties.title
        });
        // Le premier texte rencontré correspond à la description 
        if (!meta.description) meta.description = value.properties.title[0]
      }
    } else if (value.type === "code") {
        list = null;
        if (value.properties) {
          section.children.push({
            type: "code",
            value: value.properties.title,
            language : value.properties.language,
          });
        }
    } else if (value.type === "bulleted_list") {
      if (list == null) {
        list = {
          type: "list",
          children: []
        };
        section.children.push(list);
      }
      list.children.push(value.properties.title);
    } else if (value.type === "collection_view") {
      const col = await queryCollection({
        collectionId: value.collection_id,
        collectionViewId: value.view_ids[0]
      });
      const table = {};
      const entries = values(col.recordMap.block).filter(
        block => block.value && block.value.parent_id === value.collection_id
      );
      for (const entry of entries) {
      	if (entry.value.properties) {
          const props = entry.value.properties;
          
          // I wonder what `Agd&` is? it seems to be a fixed property
          // name that refers to the value
          table[
            props.title[0][0]
              .toLowerCase()
              .trim()
              .replace(/[ -_]+/, "_")
          ] = props["Agd&"];
        }

        if (sections.length === 1) {
          meta = table;
        } else {
          section.children.push({
            type: "table",
            value: table
          });
        }
      }
    } else {
      list = null;
      console.log("UNHANDLED", value);
    }
  }
  console.log("sections : ")
  sections.forEach( s => console.log(s))
  return { sections, meta };
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

function values(obj) {
  const vals = [];
  for (const key in obj) {
    vals.push(obj[key]);
  }
  return vals;
}