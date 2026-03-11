# RE: react-pdf / pdf-js loading issues
I've faced issues where the files flag NextJs and gave me a whole load of issues regarding DOMMatrix not loading properly. I was able to break them down to two scenarios where these issues would appear, further explained below.

## Loading a PDF in a visual component module
You cannot do a static import of `<Document>` or any other relevant libraries from `react-pdf`. You must do a dynamic import like so:

```cpp typescript
'use client'

import dynamic from "next/dynamic"
const Document = dynamic(() => import("react-pdf").then((m) => m.Document), {
  ssr: false,
})

const Page = dynamic(() => import("react-pdf").then((m) => m.Page), {
  ssr: false,
})
```

## Manipulating a PDF in a function
The second scenario came from when I was trying to manipulate a PDF in a function. In that case, you must import it in an async-function and call the import inside like so:

```cpp typescript
export const loadPdf = async (input: string) => {
  const { pdfjs } = await import("react-pdf")
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  const output = await pdfjs.getDocument({ data: input }).promise
  return output
}
```

