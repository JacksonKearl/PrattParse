# PrattParse

## TypeScript implementation of a Pratt parser generator

[![CircleCI](https://circleci.com/gh/JacksonKearl/PrattParse.svg?style=svg)](https://circleci.com/gh/JacksonKearl/PrattParse)

Inspired by [Pratt Parsers: Expression Parsing Made Easy](http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/).

The goal of this package is to make getting started with a computer language project in
TypeScript as simple as possible. It includes

1. A Pratt-style parser builder, located in [`src/parse.ts`](src/parse.ts)
2. A bare-bones tokenizer, located in [`src/tokenize.ts`](src/tokenize.ts)

Use as follows (located in [`src/calculator.demo.ts`](src/calculator.demo.ts)):

```ts
import { PARENTHESES_PARSELET, ParserBuilder } from "./parse"
import { Tokenizer, TokenMatchResult } from "./tokenize"

// The provided tokenizer will ignore all input that does not match a rule.
// Thus, whitespace and letters are implicitly ignored here.
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

const enum Precedence {
  AddSub = 1,
  MulDiv = 2,
  Exp = 3,
  Negate = 4,
}

export const calculate = new ParserBuilder<number, TokenMatchResult>(tokenize)
  .registerPrefix("NUMBER", { parse: (_, token) => +token.value })
  .registerPrefix("(", PARENTHESES_PARSELET)

  .prefix("-", Precedence.Negate, (_, right) => -right)

  .infixRight("^", Precedence.Exp, (left, _, right) => left ** right)

  .infixLeft("/", Precedence.MulDiv, (left, _, right) => left / right)
  .infixLeft("*", Precedence.MulDiv, (left, _, right) => left * right)
  .infixLeft("+", Precedence.AddSub, (left, _, right) => left + right)
  .infixLeft("-", Precedence.AddSub, (left, _, right) => left - right)

  .construct()

calculate("-4 * -(4 + 5 - -4)") // 52
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

#### `constructor(config)`

The constructor accepts a list of token matchers, in decreasing order of precedence. This means of you want to accept both `===`, `==`, and `=` as tokens in your language, they must be listed in that order. (But who would be crazy enough to do that?)

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

The `ParserBuilder` class is meant to help with registering parselets for the parser's inner logic. The `Parser` itself is not currently exposed, so as to reduce backwards compatibility footprint, but that may change in the future if needed.

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

After all operations have been registered, simply call `construct` to receive a function of type `string -> E`.

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
