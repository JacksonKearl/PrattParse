import { PARENTHESES_PARSELET, ParserBuilder } from './parse'
import { Tokenizer, TokenMatchResult } from './tokenize'

const { tokenize } = new Tokenizer([
	{ pattern: '+' },
	{ pattern: '-' },
	{ pattern: '*' },
	{ pattern: '/' },
	{ pattern: '^' },
	{ pattern: '(' },
	{ pattern: ')' },
	{ pattern: /\d+/, id: 'NUMBER' },
])

	.infixRight('^', Precedence.Exp, (left, _, right) => left ** right)

	.infixLeft('/', Precedence.MulDiv, (left, _, right) => left / right)
	.infixLeft('*', Precedence.MulDiv, (left, _, right) => left * right)
	.infixLeft('+', Precedence.AddSub, (left, _, right) => left + right)
	.infixLeft('-', Precedence.AddSub, (left, _, right) => left - right)

	.construct()
