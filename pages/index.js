import Layout from "../layout/index";
import getNotionData from "../data/notion";
import { useState, useEffect } from "react";
import Head from "next/head";

export default function Page({ etag, sections, meta }) {
  const focused = useFocus();
  useEffect(
    () => {
      if (focused) {
        fetch(window.location, {
          headers: {
            pragma: "no-cache"
          }
        }).then(res => {
          if (res.ok && res.headers.get("x-version") !== etag) {
            window.location.reload();
          }
        });
      }
    },
    [focused]
  );


  return (
    <Layout>
      <Head>
        {meta.title && <title>{meta.title} | Camilab.co</title>}
        {meta.description && (
          <meta name="description" content={meta.description} />
        )}
      </Head>

      {sections.map((section, i) => {
        return (
          <section
            key={`section-${i}`}
            className={i === 0 ? "intro" : ""}
            id={i === 1 ? "first" : ""}
          >
            <header>
              {i === 0 ? (
                <>
                  <h1>{renderText(section.title)}</h1>
                  {section.children[0] &&
                  section.children[0].type === "text" ? (
                    <p>{renderText(section.children[0].value)}</p>
                  ) : null}
                  
                </>
              ) : (
                <h2>{renderText(section.title)}</h2>
              )}
            </header>

            <div className="content">
              {section.children.map(subsection =>
                subsection.type === "image" ? (
                  <span className={`image ${i === 0 ? "fill" : "main"}`}>
                    <NotionImage src={subsection.src} />
                  </span>
                ) : subsection.type === "text" ? (
                  i !== 0 && <p>{renderText(subsection.value)}</p>
                ) : subsection.type === "list" ? (
                  i !== 0 && (
                    <ul>
                      {subsection.children.map(child => (
                        <li>{renderText(child)}</li>
                      ))}
                    </ul>
                  )
                ) : subsection.type === "code" ? (
                  i !== 0 && <code>{renderText(subsection.value)}</code>
                ) : null
              )}
            </div>
          </section>
        );
      })}
      
    </Layout>
  );
}

Page.getInitialProps = async ({ res }) => {
  const notionData = await getNotionData();
  console.log('notion data:', notionData)
  const etag = require("crypto")
    .createHash("md5")
    .update(JSON.stringify(notionData))
    .digest("hex");

  if (res) {
    res.setHeader("Cache-Control", "s-maxage=1, stale-while-revalidate");
    res.setHeader("X-version", etag);
  }

  return { ...notionData, etag };
};

function renderText(title) {
  return title.map(chunk => {
    let wrapper = <span>{chunk[0]}</span>;

    (chunk[1] || []).forEach(el => {
      wrapper = React.createElement(el[0], {}, wrapper);
    });

    return wrapper;
  });
}

function NotionImage({ src }) {
  if (src) {
    return <img title="image" src={src} />;
  } else {
    return <div />;
  }
}

const useFocus = () => {
  const [state, setState] = useState(null);
  const onFocusEvent = event => {
    setState(true);
  };
  const onBlurEvent = event => {
    setState(false);
  };
  useEffect(() => {
    window.addEventListener("focus", onFocusEvent);
    window.addEventListener("blur", onBlurEvent);
    return () => {
      window.removeEventListener("focus", onFocusEvent);
      window.removeEventListener("blur", onBlurEvent);
    };
  });
  return state; 
};