export function getProjection (fieldNodes) {
	return fieldNodes[0].selectionSet.selections.reduce((projections, selection) => {
		//console.log(selection.selectionSet
		//      && selection.selectionSet.selections);
		//console.log('------');
		projections[selection.name.value] = 1
		return projections
	}, {})
}