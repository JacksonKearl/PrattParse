export interface PrefixParselet<E, T extends Token> {
	parse(parser: Parser<E, T>, token: T): E
}

export interface InfixParselet<E, T extends Token> {
	precedence: number
	parse(parser: Parser<E, T>, left: E, token: T): E
}

export const PARENTHESES_PARSELET: PrefixParselet<any, any> = {
	parse(parser) {
		const expr = parser.parse()
		if (!parser.match(')')) {
			throw new Error('Parse error: expected `)`')
		}
		return expr
	},
}

export interface Token {
	id: string
	value: string
}

export class ParserBuilder<E, T extends Token> {
	private prefixParselets: Record<string, PrefixParselet<E, T>> = {}
	private infixParselets: Record<string, InfixParselet<E, T>> = {}

	constructor(private tokenizer: (stream: string) => T[]) {}

	public registerInfix(tokenType: string, parselet: InfixParselet<E, T>) {
		this.infixParselets[tokenType] = parselet
		return this
	}

	public registerPrefix(tokenType: string, parselet: PrefixParselet<E, T>) {
		this.prefixParselets[tokenType] = parselet
		return this
	}

	public prefix(tokenType: string, precedence: number, builder: (token: T, right: E) => E) {
		this.prefixParselets[tokenType] = {
			parse(parser, token) {
				const right = parser.parse(precedence)
				return builder(token, right)
			},
		}
		return this
	}

	public postfix(tokenType: string, precedence: number, builder: (left: E, token: T) => E) {
		this.infixParselets[tokenType] = {
			parse(parser, left, token) {
				return builder(left, token)
			},
			precedence,
		}
		return this
	}

	public infixLeft(tokenType: string, precedence: number, builder: (left: E, token: T, right: E) => E) {
		this.infixParselets[tokenType] = {
			parse(parser, left, token) {
				const right = parser.parse(precedence)
				return builder(left, token, right)
			},
			precedence,
		}
		return this
	}

	public infixRight(tokenType: string, precedence: number, builder: (left: E, token: T, right: E) => E) {
		this.infixParselets[tokenType] = {
			parse(parser, left, token) {
				const right = parser.parse(precedence - 1)
				return builder(left, token, right)
			},
			precedence,
		}
		return this
	}

	public construct() {
		return (input: string) =>
			new Parser(this.tokenizer(input), this.prefixParselets, this.infixParselets).parse()
	}
}

class Parser<E, T extends Token> {
	constructor(
		private tokens: T[],
		private prefixParselets: Record<string, PrefixParselet<E, T>>,
		private infixParselets: Record<string, InfixParselet<E, T>>,
	) {}

	public match(expected: string) {
		const token = this.look()
		if (token.id !== expected) {
			return false
		}

		this.consume()
		return true
	}

	public parse(precedence = 0) {
		const token = this.consume()
		const prefix = this.prefixParselets[token.id]
		if (!prefix) {
			throw Error(`Parse error at ${token.value}. No matching prefix parselet.`)
		}

		let left = prefix.parse(this, token)

		while (precedence < this.getPrecedence()) {
			const token = this.consume()
			const infix = this.infixParselets[token.id]
			left = infix.parse(this, left, token)
		}

		return left
	}

	private getPrecedence(): number {
		const nextToken = this.look()
		if (!nextToken) {
			return 0
		}
		const parser = this.infixParselets[nextToken.id]
		if (parser) {
			return parser.precedence
		}
		return 0
	}

	private consume() {
		if (!this.tokens.length) {
			throw Error('Cant consume any more tokens.')
		}
		return this.tokens.shift()!
	}

	private look() {
		return this.tokens[0]
	}
}
