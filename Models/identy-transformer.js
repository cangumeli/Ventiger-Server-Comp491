export class IdentityTransformer {
	decryptId(hash) {
		let result = hash.substring('Identity_Transformer_'.length)
		return result.length <= 0 ? null : result
	}

	encryptId(id) {
		return 'Identity_Transformer_' + (id == null ? '' : id)
	}
}
