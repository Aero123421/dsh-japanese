import ts from 'typescript'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { ensureUpstream, upstreamRoot as pinnedRoot } from './upstream.mjs'
const output = process.argv[2] ?? 'tests/fixtures/upstream-dictionaries.json'
const upstreamRoot = process.env.UPSTREAM_ROOT ?? pinnedRoot
if (!process.env.UPSTREAM_ROOT) await ensureUpstream()
const modules = new Map()
async function parse(file) {
 if(modules.has(file))return modules.get(file)
 const ast=ts.createSourceFile(file,await readFile(file,'utf8'),ts.ScriptTarget.Latest,true)
 const constants=new Map(),imports=new Map()
 function visit(node){
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer)constants.set(node.name.text,node.initializer)
  if(ts.isImportDeclaration(node)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.moduleSpecifier.text.startsWith('.'))for(const item of node.importClause.namedBindings.elements)imports.set(item.name.text,{file:resolve(dirname(file),node.moduleSpecifier.text),name:item.propertyName?.text??item.name.text})
  ts.forEachChild(node,visit)
 }
 visit(ast);const result={ast,constants,imports};modules.set(file,result);return result
}
async function value(file,node){
 const module=await parse(file)
 if(!node)throw new Error(`Unresolved dictionary value: ${file}`)
 if(ts.isIdentifier(node)){
  if(module.constants.has(node.text))return value(file,module.constants.get(node.text))
  const imported=module.imports.get(node.text)
  if(imported)return value(imported.file,(await parse(imported.file)).constants.get(imported.name))
 }
 if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text
 if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken)return (await value(file,node.left))+(await value(file,node.right))
 if(ts.isArrayLiteralExpression(node))return Promise.all(node.elements.map(element=>value(file,element)))
 if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='join'){
  const parts=await value(file,node.expression.expression)
  if(!Array.isArray(parts))throw new Error(`Expected dictionary string array: ${file}`)
  return parts.join(node.arguments[0]?await value(file,node.arguments[0]):',')
 }
 if(ts.isAsExpression(node)||ts.isSatisfiesExpression(node)||ts.isParenthesizedExpression(node))return value(file,node.expression)
 if(ts.isPropertyAccessExpression(node))return (await value(file,node.expression))[node.name.text]
 if(ts.isTemplateExpression(node)){let text=node.head.text;for(const span of node.templateSpans)text+=String(await value(file,span.expression))+span.literal.text;return text}
 if(ts.isObjectLiteralExpression(node)){
  const result={}
  for(const property of node.properties){
   if(ts.isSpreadAssignment(property))Object.assign(result,await value(file,property.expression))
   else if(ts.isPropertyAssignment(property))result[ts.isComputedPropertyName(property.name)?await value(file,property.name.expression):property.name.text]=await value(file,property.initializer)
   else if(ts.isShorthandPropertyAssignment(property))result[property.name.text]=await value(file,property.name)
  }
  return result
 }
 throw new Error(`Unsupported dictionary syntax: ${file}: ${node.getText(module.ast).slice(0,80)}`)
}
async function walk(folder){
 const files=[]
 for(const item of await readdir(folder,{withFileTypes:true})){
  const file=resolve(folder,item.name)
  if(item.isDirectory()&&!['lib','tests','node_modules'].includes(item.name))files.push(...await walk(file))
  else if(item.isFile()&&item.name.endsWith('.ts'))files.push(file)
 }
 return files
}
const contract={}
for(const folder of ['packages/client','packages/extensions/ui-cordis','packages/experimental/client-ui-claude-code-mods'])for(const file of await walk(resolve(upstreamRoot,folder))){
 const module=await parse(file),calls=[]
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(module.ast)==='ctx.locale.register'&&node.arguments.length===2&&ts.isObjectLiteralExpression(node.arguments[1]))calls.push(node);ts.forEachChild(node,visit)}
 visit(module.ast)
 for(const call of calls){
  const english=call.arguments[1].properties.find(property=>property.name?.getText(module.ast)==='en')
  if(english)contract[await value(file,call.arguments[0])]=await value(file,english.initializer??english.name)
 }
}
for(const [ns,file,name] of [['common','packages/client/locale/src/locales/en.ts','en'],['settings.locale','packages/client/locale/src/locales/settings.ts','en'],['chat','packages/client/ui-chat/src/client/locale.ts','en']]){
 const path=resolve(upstreamRoot,file);contract[ns]=await value(path,(await parse(path)).constants.get(name))
}
await writeFile(output,JSON.stringify(Object.fromEntries(Object.entries(contract).sort()),null,2)+'\n')
console.log(`Official dictionary contract: ${Object.keys(contract).length} namespaces, ${Object.values(contract).reduce((n,dict)=>n+Object.keys(dict).length,0)} keys`)
