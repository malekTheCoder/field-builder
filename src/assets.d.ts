/** Vite embeds the offline handout's font as a data URL, including in the static build. */
declare module '*.woff2?inline' {
 const url: string;
 export default url;
}
