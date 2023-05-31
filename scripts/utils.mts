import fs from 'fs/promises';
import { Folder } from './constants.mjs';

const NESTED_PACKAGE_JSON = JSON.stringify(
  {
    sideEffects: false,
    module: './index.js',
    main: './index.cjs',
    types: './index.d.ts',
  },
  undefined,
  2
);

export const addNestedPackagesJson = async (path: string) => {
  const dirs = await fs.readdir(path);

  for (let i = 0; i < dirs.length; i++) {
    const folder = dirs[i];

    if ((await fs.lstat(`${path}/${folder}`)).isDirectory()) {
      await fs.writeFile(`${path}/${folder}/package.json`, NESTED_PACKAGE_JSON);
    }
  }
};

const pickFrom = (obj: Record<string, any>, keys: string[]) =>
  keys.reduce<Record<string, any>>(
    (acc, key) => ({ ...acc, [key]: obj[key] }),
    {}
  );

export const getMainPackageJson = async () =>
  JSON.stringify(
    {
      ...pickFrom(JSON.parse((await fs.readFile('package.json')).toString()), [
        'name',
        'version',
        'author',
        'description',
        'keywords',
        'repository',
        'license',
        'bugs',
        'homepage',
        'peerDependencies',
        'peerDependenciesMeta',
        'dependencies',
        'engines',
      ]),
      publishConfig: {
        access: 'public',
      },
      main: './index.cjs',
      module: './index.js',
      types: './index.d.ts',
      sideEffects: false,
    },
    undefined,
    2
  );

const handleDeclarationFile = async (path: string) => {
  if ((await fs.readFile(path)).toString() === 'export {};\n') {
    await fs.rm(path);
  }
};

const updateExport = async (path: string, regEx: RegExp) => {
  const prevValue = (await fs.readFile(path)).toString();

  const newValue = prevValue.replace(regEx, `$1${Folder.CHUNKS}/$2`);

  if (prevValue !== newValue) {
    await fs.writeFile(path, newValue);
  }
};

export const handleChild = async (path: string) => {
  if (path.endsWith('.d.ts')) {
    await handleDeclarationFile(path);
  } else if (path.endsWith('.js')) {
    await updateExport(
      path,
      /(export \{ .+ as .+ \} from\s+['"][\.\.\/]+)(chunk-\w+\.js['"])/g
    );
  } else if (path.endsWith('.cjs')) {
    await updateExport(path, /(require\(['"][\.\.\/]+)(chunk-\w+\.cjs['"]\))/g);
  } else if ((await fs.lstat(path)).isDirectory()) {
    await handleFolder(path);
  }
};

const handleFolder = async (path: string) => {
  const nested = await fs.readdir(path);

  for (let i = 0; i < nested.length; i++) {
    await handleChild(`${path}/${nested[i]}`);
  }

  if (!(await fs.readdir(path)).length) {
    await fs.rmdir(path);
  }
};
