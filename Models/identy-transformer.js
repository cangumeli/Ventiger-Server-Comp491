export class IdentityTransformer {
	decryptId(hash) {
		if (!hash.substring) {
			hash = hash.toString()
		}
		let result = hash.substring('Identity_Transformer_'.length)
		return result.length <= 0 ? null : result
	}

	encryptId(id) {
		return 'Identity_Transformer_' + (id == null ? '' : id)
	}
}

export default IdentityTransformer