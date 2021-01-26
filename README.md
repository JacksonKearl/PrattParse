# PrattParse

## TypeScript implementation of a Pratt parser generator

[![CircleCI](https://circleci.com/gh/JacksonKearl/PrattParse.svg?style=svg)](https://circleci.com/gh/JacksonKearl/PrattParse)

Inspired by [Pratt Parsers: Expression Parsing Made Easy](http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/).

The goal of this package is to make getting started with a computer language project in
TypeScript as simple as possible. It includes:

1. A Pratt-style parser builder, located in [`src/parse.ts`](src/parse.ts)
2. A simple and possibly inefficient tokenizer, located in [`src/tokenize.ts`](src/tokenize.ts)

## Getting Started With Local Developement

Build as follows:
```bash
npm install
npm run build
```

To run the tests:
```bash

change
npm run test
```

To restore newly cloned state:

```bash
git clean -xfd
```

Use as follows:

Simple:
```ts
import { ParserBuilder, Tokenizer, TokenMatchResult } from "."

const { tokenize } = new Tokenizer([
  { pattern: "+" },
  { pattern: "-" },
  { pattern: /\d+/, id: "NUMBER" },
])

const calculate = new ParserBuilder<number, TokenMatchResult>(tokenize)
  .registerPrefix("NUMBER", { parse: (_, token) => +token.value })
  .infixLeft("+", 1, (left, _, right) => left + right)
  .infixLeft("-", 1, (left, _, right) => left - right)
  .construct()

console.log(calculate("2+2-1"))
```

Advanced:
```ts
import { PARENTHESES_PARSELET, ParserBuilder, Tokenizer, TokenMatchResult } from "."

const { tokenize } = new Tokenizer([
  { pattern: "+" },
  { pattern: "-" },
  { pattern: "*" },
  { pattern: "/" },
  { pattern: "^" },
  { pattern: "(" },
  { pattern: ")" },
  { pattern: /\d+/, id: "NUMBER" },
])

// try experimenting with these values to see how the results change!
const enum Precedence {
  AddSub = 2,
  MulDiv = 1,
  Exp = 4,
  Negate = 3,
}

const calculate = new ParserBuilder<number, TokenMatchResult>(tokenize)
  .registerPrefix("NUMBER", { parse: (_, token) => +token.value })
  .registerPrefix("(", PARENTHESES_PARSELET)

  .prefix("-", Precedence.Negate, (_, right) => -right)

  .infixRight("^", Precedence.Exp, (left, _, right) => left ** right)

  .infixLeft("/", Precedence.MulDiv, (left, _, right) => left / right)
  .infixLeft("*", Precedence.MulDiv, (left, _, right) => left * right)
  .infixLeft("+", Precedence.AddSub, (left, _, right) => left + right)
  .infixLeft("-", Precedence.AddSub, (left, _, right) => left - right)

  .construct()

console.log(calculate("-2^2"))
console.log(calculate("2*3+10*10"))

console.log(calculate("-4 * -(4 + 5 - -4)^2"))
```

## API

### `Tokenizer`

Note: this tokenizer is very simple and likely not all that efficient. PR's are welcome, alternatively you can provide your own tokenizer, so long as it produces tokens conforming to

```ts
export interface Token {
  id: string
  value: string
}
```

Where `id` is the unique identifier of the token's category, and `value` is the matched text (used only in error messages).

#### `constructor(matchers)`

The constructor accepts a list of token matchers, in decreasing order of precedence. This means of you want to accept both `===`, `==`, and `=` as tokens in your language, they must be listed in that order. (But who would be crazy enough to want that in their language?)

The token matchers may be of type:

- `{pattern: string}`
- `{pattern: string, id: string}`
- `{pattern: RegExp, id: string}`

If a `pattern` is a string and no `id` is provided, the `pattern` will be used as the `id`. All `id`'s must be unique.

#### `tokenize(input)`

The tokenize method accepts a string as input, and returns a list of `TokenMatchResult`:

```ts
export interface TokenMatchResult {
  id: string
  pattern: RegExp
  value: string
}
```

The `id` and `pattern` as as above, and `value` is the matched text, helpful in cases of RegExp tokens.

### `ParserBuilder<E, T>`

The `ParserBuilder` class is meant to help with registering parselets for the parser's inner logic.

`E` is the type of the AST nodes you will be generating, and `T` is the type of the tokens you will be consuming. If you are using the provided `Tokenizer`, this is `TokenMatchResult`.

`T` must conform to `Token`:

```ts
export interface Token {
  id: string
  value: string
}
```

Where `id` is the unique identifier of the token's category, and `value` is the matched text (used only in error messages).

#### `constructor(tokenizer)`

The constructor takes a single argument, the tokenizer. It must be a function from `string -> T[]`, where `T` implements `Token`.

#### `construct`

After all operations have been registered, simply call `construct()` to receive a function of type `string -> E`.

#### High Level API

The High Level API is used to construct most "normal" parsing strategies: binary operators of either associativity, prefix operators, and postfix operators. These all return `this`, to make for easy chaining.

##### `prefix`

```ts
prefix(tokenType: string, precedence: number, builder: (token: T, right: E) => E): ParserBuilder
```

The `right` parameter to `builder` is the node the prefix is operating upon.

##### `postfix`

```ts
postfix(tokenType: string, precedence: number, builder: (left: E, token: T) => E): ParserBuilder
```

The `left` parameter to `builder` is the node the postfix is operating upon.

##### `infixLeft`

```ts
infixLeft(
    tokenType: string,
    precedence: number,
    builder: (left: E, token: T, right: E) => E,
  ): ParserBuilder
```

This parsers an infix operator with left-associativity (typical for addition, etc.).

##### `infixRight`

```ts
infixRight(
    tokenType: string,
    precedence: number,
    builder: (left: E, token: T, right: E) => E,
  ): ParserBuilder
```

This parsers an infix operator with right-associativity (typical for exponentiation).

#### Low Level API

The Low Level API is used in cases where the parser needs a bit more logic than simply consuming AST nodes. This is helpful scenarios such as:

- Initial parsing of string names and numbers from the source text into their AST node representations
- Parsing things like parentheses, which need to consume the end parentheses token upon completion.

This API gives access to the parser in the callback, which is helpful for cases when you need to parse additional tokens while consuming a single AST node. An example would be when parsing a ternary operator, you would first consume the `?`, then an expression, then the `:`, then another expression, all to construct a single node.

The parser is not documented here, as it is potentially unstable, but can be viewed at [`src/parse.ts`](src/parse.ts).

These also return `this`, for chaining.

##### `registerInfix`

```ts
registerInfix(tokenType: string, parselet: InfixParselet<E, T>): ParserBuilder
```

Where `InfixParselet` is:

```ts
interface InfixParselet<E, T extends Token> {
  precedence: number
  parse(parser: Parser<E, T>, left: E, token: T): E
}
```

##### `registerPrefix`

```ts
registerPrefix(tokenType: string, parselet: PrefixParselet<E, T>): ParserBuilder
```

Where `PrefixParselet` is:

```ts
export interface PrefixParselet<E, T extends Token> {
  parse(parser: Parser<E, T>, token: T): E
}
```

Note that you don't receive the `right` AST node here, as you do in the High Level API's `prefix`. This means you must call the parser on the right expression yourself. An example is the provided `PARENTHESES_PARSELET`:

```ts
export const PARENTHESES_PARSELET: PrefixParselet<any, any> = {
  parse(parser) {
    const expr = parser.parse()
    if (!parser.match(")")) {
      throw new Error("Parse error: expected `)`")
    }
    return expr
  },
}
```

```ts
export const isTrusted = (url: string, trustedURL: string): boolean => {
	const normalize = (url: string) => url.replace(/\/+$/, '');
	trustedURL = normalize(trustedURL);
	url = normalize(url);

	const memo = Array.from({ length: url.length + 1 }).map(() =>
		Array.from({ length: trustedURL.length + 1 }).map(() => undefined),
	);

	if (/^[^./:]*:\/\//.test(trustedURL)) {
		return doURLMatch(memo, url, trustedURL, 0, 0);
	}

	const scheme = /^(https?):\/\//.exec(url)?.[1];
	if (scheme) {
		return doURLMatch(memo, url, `${scheme}://${trustedURL}`, 0, 0);
	}

	return false;
};

const doURLMatch = (
	memo: (boolean | undefined)[][],
	url: string,
	trustedURL: string,
	urlOffset: number,
	trustedURLOffset: number,
): boolean => {
	if (memo[urlOffset]?.[trustedURLOffset] !== undefined) {
		return memo[urlOffset][trustedURLOffset]!;
	}

	const options = [];

  // Endgame.
  // Fully exact match
	if (urlOffset === url.length) {
		return trustedURLOffset === trustedURL.length;
  }

  // Some path remaining in url
  if (trustedURLOffset === trustedURL.length) {
    // const consumed = url.slice(0, urlOffset)
    const remaining = url.slice(urlOffset)
    return remaining[0] === '/'
  }

	if (url[urlOffset] === trustedURL[trustedURLOffset]) {
		// Exact match.
		options.push(doURLMatch(memo, url, trustedURL, urlOffset + 1, trustedURLOffset + 1));
	}

	if (trustedURL[trustedURLOffset] + trustedURL[trustedURLOffset + 1] === '*.') {
		// Any subdomain match. Either consume one thing that's not a / or : and don't advance base or consume nothing and do.
		if (!['/', ':'].includes(url[urlOffset])) {
			options.push(doURLMatch(memo, url, trustedURL, urlOffset + 1, trustedURLOffset));
		}
		options.push(doURLMatch(memo, url, trustedURL, urlOffset, trustedURLOffset + 2));
	}

	if (trustedURL[trustedURLOffset] + trustedURL[trustedURLOffset + 1] === '.*' && url[urlOffset] === '.') {
		// IP mode. Consume one segment of numbers or nothing.
		let endBlockIndex = urlOffset + 1;
		do { endBlockIndex++; } while (/[0-9]/.test(url[endBlockIndex]));
		if (['.', ':', '/', undefined].includes(url[endBlockIndex])) {
			options.push(doURLMatch(memo, url, trustedURL, endBlockIndex, trustedURLOffset + 2));
		}
	}

	if (trustedURL[trustedURLOffset] + trustedURL[trustedURLOffset + 1] === ':*') {
		// any port match. Consume a port if it exists otherwise nothing. Always comsume the base.
		if (url[urlOffset] === ':') {
			let endPortIndex = urlOffset + 1;
			do { endPortIndex++; } while (/[0-9]/.test(url[endPortIndex]));
			options.push(doURLMatch(memo, url, trustedURL, endPortIndex, trustedURLOffset + 2));
		} else {
			options.push(doURLMatch(memo, url, trustedURL, urlOffset, trustedURLOffset + 2));
		}
	}

	return (memo[urlOffset][trustedURLOffset] = options.some(a => a === true));
};


const test = (expected, url, trusted) => {
  const real = isTrusted(url, trusted)
  if (real !== expected) {
    console.log(url, trusted, 'was not', expected )
  }
}

test(true, 'https://*.visualstudio.com', 'https://*.visualstudio.com')
test(true, 'https://hello.visualstudio.com/sadf', 'https://*.visualstudio.com')
test(false, 'https://hello.visualstudio.com/sadf', 'https://*.visualstudio.com/dfsd')
test(true, 'https://hello.visualstudio.com/sadf', 'https://*.visualstudio.com/sadf')
test(false, 'https://hello.visualstudio.com/sadf', 'https://*.visualstudio.com/sadf/fds')
test(false, 'https://hello.visualstudio.com/sadff', 'https://*.visualstudio.com/sadf')
test(true, 'https://hello.visualstudio.com/sadf/fds', 'https://*.visualstudio.com/sadf/fds')
test(true, 'https://hello.visualstudio.com/sadf/fds/rwer', 'https://*.visualstudio.com/sadf/fds')
test(true, 'https://h.e.llo.visualstudio.com', 'https://*.visualstudio.com')
test(false, 'https://h.e/llo.visualstudio.com', 'https://*.visualstudio.com')

test(false, 'https://h.e.llo.visualstudio.com', 'https://*.visualstudio.com:80')
test(true, 'https://h.e.llo.visualstudio.com', 'https://*.visualstudio.com')
test(true, 'https://h.e.llo.visualstudio.com:80', 'https://*.visualstudio.com:80')
test(false, 'https://h.e.llo.visualstudio.com:80', 'https://*.visualstudio.com:8080')
test(true, 'https://h.e.llo.visualstudio.com:80', 'https://*.visualstudio.com:*')

test(true, 'https://h.e.llo.visualstudio.com', '*.visualstudio.com')
test(true, 'http://h.e.llo.visualstudio.com', '*.visualstudio.com')
test(false, 'ftp://h.e.llo.visualstudio.com', '*.visualstudio.com')

test(true, 'http://192.168.1.7:3000/', 'http://192.168.1.7:3000/')
test(true, 'http://192.168.1.7:3000/', 'http://192.168.1.7:*')
test(true, 'http://192.168.1.7:3000/', 'http://192.168.1.*:*')
test(false, 'http://192.168.1.7:3000/', 'http://192.168.*.6:*')

test(true, 'http://192.168.1.7', 'http://192.168.1.*')
```

```shellscript
npm install insane
```

```ts
var insane = require("insane")

const start = `
<div class="welcomePageContainer">
	<div class="welcomePage" role="document">
		<div class="title">
			<h1 class="caption">Visual Studio Code</h1>
			<p class="subtitle detail">Editing evolved</p>
		</div>
		<div class="row">
			<div class="splash">
				<div class="section start">
					<h2 class="caption">Start</h2>
					<ul>
						<li><a href="command:workbench.action.files.newUntitledFile">New file</a></li>
						<li class="mac-only"><a href="command:workbench.action.files.openFileFolder">Open folder...</a></li>
						<li class="windows-only linux-only"><a href="command:workbench.action.files.openFolder">Open folder...</a></li>
						<li><a href="command:workbench.action.addRootFolder">Add workspace folder...</a></li>
					</ul>
				</div>
			</div>
		</div>
    </div>
</div>
`

const options = {
  "allowedTags": ["a", "button", "code", "div", "h1", "h2", "h3", "input", "label", "li", "p", "pre", "select", "small", "span", "textarea", "ul"],
  "allowedAttributes": {
      "a": ["href", "class", "id", "role", "tabindex"],
      "button": ["data-href", "class", "id", "role", "tabindex"],
      "input": ["type", "placeholder", "checked", "required", "class", "id", "role", "tabindex"],
      "label": ["for", "class", "id", "role", "tabindex"],
      "select": ["required", "class", "id", "role", "tabindex"],
      "span": ["data-command", "role", "class", "id", "role", "tabindex"],
      "textarea": ["name", "placeholder", "required", "class", "id", "role", "tabindex"],
      "code": ["class", "id", "role", "tabindex"],
      "div": ["class", "id", "role", "tabindex"],
      "h1": ["class", "id", "role", "tabindex"],
      "h2": ["class", "id", "role", "tabindex"],
      "h3": ["class", "id", "role", "tabindex"],
      "li": ["class", "id", "role", "tabindex"],
      "p": ["class", "id", "role", "tabindex"],
      "pre": ["class", "id", "role", "tabindex"],
      "small": ["class", "id", "role", "tabindex"],
      "ul": ["class", "id", "role", "tabindex"]
  }
}

console.log(insane(start, options))
```

```ts
var insane = require("insane")

const start = `
<a href="a">New file</a>
<a href="a:b">New file</a>
<a href="command:workbench.action.files.newUntitledFile">New file</a>
<li><a href="command:workbench.action.files.newUntitledFile">New file</a></li>
`

const options = {
  "allowedTags": ["a", 'li'],
  "allowedAttributes": {
      "a": ["href"]
  }
}

console.log(insane(start, options))
```

```ts
var insane = require("insane")

const start = `
<a href="a">New file</a>
<a href="a:b">New file</a>
<a href="command:workbench.action.files.newUntitledFile">New file</a>
<li><a href="command:workbench.action.files.newUntitledFile">New file</a></li>
`

const options = {
  "allowedTags": ["a", 'li'],
  "allowedAttributes": {
      "a": ["href"]
  },
  allowedSchemes: ['command']
}

console.log(insane(start, options))
```

```ts
const doThing = async () => {
  console.log('doin things!');
  await new Promise(resolve => setTimeout(resolve, 1000))
  doThing()
}

doThing()
```
