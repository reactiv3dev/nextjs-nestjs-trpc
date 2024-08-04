# nextjs-nestjs-trpc

I **love** using [Next.js](https://nextjs.org/), [Nest.js](https://nestjs.com), and in this boilerplate I will make monorepo with [tRPC](https://trpc.io)

## MONOREPO SETUP
1. Initialize project with pnpm:
```
pnpm init
```
2. Create `pnpm-workspace.yaml` and specify folder where apps going to reside:
```
packages:
  - "apps/*"
```
3. Get into `apps` dir and install new `nestjs` server application with command: 
```
nest new server --strict --skip-git --package-manager=pnpm
```

4. Change PORT variable or even better set it to read from ENV.
```
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 5000);
}
```
* NOTE: Be careful not to have same port on Nest and Nextjs so they dont collide.
5. From same `apps` now install `nextjs` client application with:
```
pnpx create-next-app@latest
```

*** 
The tRPC server will live inside the NestJS application, and the tRPC client will live inside the NextJS application.

The tRPC client will need access to a type called AppRouter (we'll get to this in the next section) which is defined inside of the NestJS app.

In our current setup, this won't be possible - you can only import files from the respective app you're in.
*** 
6. In order for tRPC protocol to work, we need for frontend and backend to have common types (since it is reasoning behind it).
In root of project we make `tsconfig.json` and configure it:

> tsconfig.json
```
{
  "compilerOptions": {
    "baseUrl": ".",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@server/*": ["./apps/server/src/*"],
      "@web/*": ["./apps/web/*"]
    }
  }
}
```

7. Next, we need to update the tsconfig.json file in both applications to extend the tsconfig.json at the root of the project, and comment out all duplicated configurational properties.

> apps/server/tsconfig.json
```
{
  "extends": "../../tsconfig.json", // Extend the config options from the root
  "compilerOptions": {
    // The following options are not required as they've been moved to the root tsconfig
    // "baseUrl": "./",
    // "emitDecoratorMetadata": true,
    // "experimentalDecorators": true,
    // "incremental": true,
    // "skipLibCheck": true,
    // "strictNullChecks": true,
    // "noImplicitAny": true,
    // "strictBindCallApply": true,
    // "forceConsistentCasingInFileNames": true,
    // "noFallthroughCasesInSwitch": true
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "allowSyntheticDefaultImports": true,
    "target": "es2017",
    "sourceMap": true,
    "outDir": "./dist",
  }
}
```

> apps/client/tsconfig.json
```
{
  "extends": "../../tsconfig.json", // Extend the config options from the root,
  "compilerOptions": {
    // The following options are not required as they've been moved to the root tsconfig
    // "paths": {
    //   "@/*": ["./*"]
    // }
    // "incremental": true,
    // "forceConsistentCasingInFileNames": true,
    // "skipLibCheck": true,
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [
      {
        "name": "next"
      }
    ],
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

8. Setting common `dev` script so we can spin both apps at the same time with one command.
- condiotion for next command to work is that we need to make both `dev` commands to be called as such, not `start:dev` as in `nestjs`, then we in scripts in root package.json make command called `dev`:
> root/package.json
```

  "scripts": {
    "dev": "pnpm run --parallel dev"
  },
```
- We can now just run
```
pnpm dev
```

### ADDING PACKAGES TO APPS
- To add package to particular app f.e. `server` you dont have to go into that folder with terminal, you can execute next command from the root, lets say we want to add config package to nestjs `server`:
```
pnpm add @nestjs/config --filter=server
``` 


## tRPC setup
- In order for this to work, we need to make tRPC server through which we will provide types and hence safety to the client app.
1. We install two packages need for described actions:
```
pnpm add @trpc/server zod --filter=server
```
2. Then we go to `server` directory and execute command for generating trpc module which will be auto generated and provided into app module:
> ./apps/server/
```
nest generate module trpc
```
3. Next generate service in trpc module call it trpc.service.ts.
- its purpose is to expose tRPC API methods 
```
nest generate service trpc
```

4. tRPC service setup:
```
@Injectable()
export class TrpcService {
  trpc = initTRPC.create();
  procedure = this.trpc.procedure;
  router = this.trpc.router;
  mergeRouters = this.trpc.mergeRouters;
  
}
```

5. Setup tRPC router -> equivalent to Nest's controllers, so: 
- Create `trpc.router.ts` file and inject service in constructor as we normally would in controller.
- Then we define `appRouter()` method trough which we will include all methods we want to expose (its like an entry point for all exposed methods) :

> ./server/src/trpc/trpc.router.ts
```
Injectable();
export class TrpcRouter {
  constructor(private readonly trpcService: TrpcService) {}

  appRouter = this.trpcService.router({
    hello: this.trpcService.procedure
      .input(z.object({ name: z.string().optional() }))
      .query(({ input }) => {
        return `Hello ${input.name ? input.name : 'World'}`;
      }),
  });
}
```

- In order for `Nest` server to know about router we need to wrap it so to say,
to set it as middlewre so app knows when we  hit `/trpc`, so we create method `applyMiddleware(app: INestMiddleware)`

> ./server/src/trpc/trpc.router.ts
```
import { INestApplication, Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { z } from 'zod';
import * as trpcExpress from '@trpc/server/adapters/express';

Injectable();
export class TrpcRouter {
  constructor(private readonly trpcService: TrpcService) {}

  appRouter = this.trpcService.router({
    hello: this.trpcService.procedure
      .input(z.object({ name: z.string().optional() }))
      .query(({ input }) => {
        return `Hello ${input.name ? input.name : 'World'}`;
      }),
  });

  async applyMiddleware(app: INestApplication) {
    app.use(
      '/trpc',
      trpcExpress.createExpressMiddleware({
        router: this.appRouter,
      }),
    );
  }
}

export type AppRouter = TrpcRouter[`appRouter`];
```

- `TrpcRouter` should be registered as `provider` in `TrpcModule`

- The final thing to do before the tRPC server is ready is update the main.ts file to apply the middleware we defined in the router above and enable CORS:

> server/src/main.ts
```
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrpcRouter } from '@server/trpc/trpc.router';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const trpc = app.get(TrpcRouter);
  trpc.applyMiddleware(app);
  await app.listen(4000);
}
bootstrap();
```

- To enable tRPC on `frontend` we need to install next packages:
```
pnpm add @trpc/server @trpc/client --filter=client
```

- in `lib` or in `app` folder make `trpc.ts` file where you will initialize trpc client:
> .client/app/trpc.ts
```
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { AppRouter } from "@server/trpc/trpc.router";

export const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({ url: "http://localhost:5000/trpc"}) // TODO: use env var
    ]
});
```
* `AppRouter` is type that is common to backend and frontend and it keeps all types that are shareable betweeen the two as contract.

- Usage is simple as:
```
import { trpc } from "./trpc";

export default async function Home() {

  const response = await trpc.hello.query({});
  return <main>
    <h2>{response}</h2>
  </main>
}

```