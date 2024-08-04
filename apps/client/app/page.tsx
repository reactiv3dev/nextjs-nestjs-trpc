import { trpc } from "./trpc";

export default async function Home() {

  const response = await trpc.hello.query({});
  return <main>
    <h2>{response}</h2>
  </main>
}
