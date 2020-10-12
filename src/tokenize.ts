type TokenMatcher =
	| { pattern: string }
	| {
			id: string
			pattern: string | RegExp
	  }

interface NormalizedMatcher {
	id: string
	pattern: RegExp
}

export interface TokenMatchResult extends NormalizedMatcher {
	value: string
}

const matchRegexOperators = /[|\\{}()[\]^$+*?.-]/g
const selectRegexInner = /^\/(.*)\/.*$/
const asRegexString = (str: string | RegExp) =>
	typeof str === 'string'
		? str.replace(matchRegexOperators, '\\$&')
		: str.toString().match(selectRegexInner)![1]

export class Tokenizer {
	private matchAll: RegExp
	private matchers: NormalizedMatcher[]

	public constructor(matchers: TokenMatcher[]) {
		this.matchers = matchers.map(matcher => ({
			id: 'id' in matcher ? matcher.id : matcher.pattern,
			pattern: new RegExp(asRegexString(matcher.pattern)),
		}))
		this.matchAll = new RegExp(matchers.map(matcher => asRegexString(matcher.pattern)).join('|'), 'g')

		this.tokenize = this.tokenize.bind(this)
	}

	public tokenize(str: string): TokenMatchResult[] {
		// Double-execing the RegExp is actually not that slow. Faster than my attempted alternative implementation.
		// https://jsperf.com/tokenization-strategies-jkearl-pratt/1

		const tokens = str.match(this.matchAll)
		if (!tokens) {
			throw new Error('Could not tokenize')
		}

		return tokens.map(value => ({
			...this.matchers.find(matcher => matcher.pattern.test(value))!,
			value,
		}))
	}
}
