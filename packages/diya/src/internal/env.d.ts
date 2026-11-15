// Bundlers replace process.env.NODE_ENV in the package's development warnings, as they do in
// React's own; the package doesn't depend on Node's types for that one name.
declare const process: { env: { NODE_ENV?: string } }
