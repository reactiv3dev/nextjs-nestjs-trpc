# nextjs-nestjs-trpc


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