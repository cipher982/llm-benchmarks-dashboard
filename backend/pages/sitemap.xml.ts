import type { GetServerSideProps } from "next";
import { generateSitemap } from "./api/sitemap";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    const sitemap = await generateSitemap();
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.write(sitemap);
    res.end();
  } catch (error) {
    console.error("Error generating /sitemap.xml:", error);
    res.statusCode = 500;
    res.end("Failed to generate sitemap");
  }

  return {
    props: {},
  };
};

const SitemapXml = () => null;

export default SitemapXml;
