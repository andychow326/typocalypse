class_name Trie
extends Node

var root = TrieNode.new()


func form_trie(items: Array, key_map: Callable, data_map: Callable):
	for item in items:
		insert(key_map.call(item), data_map.call(item))


func insert(key: String, data):
	var node = root

	for token in key:
		if not node.children.has(token):
			node.children[token] = TrieNode.new()
		node = node.children[token]

	node.last = true
	node.data = data


func remove_word(key: String):
	var node = root
	var parent = null
	var parentKey = ""
	var delete_word = []

	for token in key:
		if not node.children.has(token):
			return
		parent = node
		parentKey = token
		delete_word.append(node)
		node = node.children[token]
	for word in delete_word:
		word = null
		print("word removed")


func get_potential_candidates_by_node(node: TrieNode, key: String, result_map: Callable):
	var results = []
	if node.last:
		results.append(result_map.call(node))

	for token in node.children.keys():
		var candidates = get_potential_candidates_by_node(
			node.children[token],
			key + token,
			result_map,
		)
		results.append_array(candidates)

	return results


func get_potential_candidates(key: String):
	var node = root

	for token in key:
		if not node.children.has(token):
			return []
		node = node.children[token]

	return get_potential_candidates_by_node(node, key, func(n: TrieNode): return n.data)


class TrieNode:
	var children = {}
	var last = false
	var data = null
