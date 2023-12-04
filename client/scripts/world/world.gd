extends Node3D


const Trie = preload("res://scripts/trie.gd")


@export var player_scene: PackedScene
@export var zombie_scene: PackedScene

var player_positions = [
	Vector3(-1.5, 0, 16),
	Vector3(1.5, 0, 16),
	Vector3(-3, 0, 14),
	Vector3(3, 0, 14),
]
var player_tries: Dictionary
var player_active_inputs: Dictionary
var dead_zombies: Dictionary
var last_potential_target_zombies: Array
var game_stated: bool


func _ready():
	$RoundStartLabel.visible = false
	$RemainingTimeLabel.visible = false
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"input":
			if not game_stated:
				return
			var player_id = message.user.id
			var key = message.data.key
			on_player_inputted_key(player_id, key)
		"remainingTime":
			if message.data.type == "waitForRoundStart":
				game_stated = false
				$RoundStartLabel.text = "%.f" % (float(message.data.remainingTime + 500) / 1000)
			if message.data.type == "round":
				game_stated = true
				$RoundStartLabel.visible = false
				$RemainingTimeLabel.visible = true
				$RemainingTimeLabel.text = "%.1f" % (float(message.data.remainingTime) / 1000)
		"startGame":
			reset_player_container()

			var words: Array = []
			for word in message.data.room.words:
				var zombie_node = zombie_scene.instantiate()
				zombie_node.position = Vector3(randf_range(-10, 10), 0, randf_range(0, -5))
				zombie_node.from_dict({
					"label": word.word,
					"target_player_id": word.userId,
				})
				var word_item = {"zombie_id": len(words)}
				word_item.merge(word)
				words.append(word_item)
				$ZombieContainer.add_child(zombie_node)

			var position_index = 0
			for user in message.data.room.users.values():
				var user_words = words.filter(
					func (word: Dictionary): return word.userId == user.id,
				)
				var trie = Trie.new()
				trie.form_trie(
					user_words,
					func (item: Dictionary): return item.word,
					func (item: Dictionary): return item,
				)
				player_tries[user.id] = trie
				player_active_inputs[user.id] = ""

				var player_node = player_scene.instantiate()
				player_node.position = player_positions[position_index]
				player_node.from_dict(user)
				$PlayerContainer.add_child(player_node)
				position_index += 1

			$RoundStartLabel.text = "READY"
			await get_tree().create_timer(1).timeout


func reset_player_container():
	var children = $PlayerContainer.get_children()
	for child in children:
		child.queue_free()
		$PlayerContainer.remove_child(child)


func reset_zombie_container():
	var children = $ZombieContainer.get_children()
	for child in children:
		child.queue_free()
		$ZombieContainer.remove_child(child)


func _on_visibility_changed():
	if visible:
		$RoundStartLabel.visible = true
		$RemainingTimeLabel.visible = false


func reset_active_zombies(indexs: Array):
	for index in indexs:
		var node = $ZombieContainer.get_child(index)
		node.set_active("")


func on_player_inputted_key(player_id: String, key: String):
	player_active_inputs[player_id] += key
	var potential_target_zombies: Array = player_tries[player_id].get_potential_candidates(player_active_inputs[player_id])
	potential_target_zombies = potential_target_zombies.filter(
		func (zombie: Dictionary): return not dead_zombies.has(zombie.zombie_id)
	)

	if potential_target_zombies.is_empty():
		player_active_inputs[player_id] = ""
		reset_active_zombies(
			last_potential_target_zombies.map(
				func (item: Dictionary): return item.zombie_id
			)
		)
		return

	for zombie in potential_target_zombies:
		var node = $ZombieContainer.get_child(zombie.zombie_id)
		node.set_active(player_active_inputs[player_id])
		if zombie.word == player_active_inputs[player_id]:
			dead_zombies[zombie.zombie_id] = zombie
			player_active_inputs[player_id] = ""

	var inactive_zombie_ids = last_potential_target_zombies.filter(
		func (item1: Dictionary): return not potential_target_zombies.any(
			func (item2: Dictionary): return item1.zombie_id == item2.zombie_id
		)
	).map(func (item: Dictionary): return item.zombie_id)
	reset_active_zombies(inactive_zombie_ids)
	last_potential_target_zombies = potential_target_zombies.filter(
		func (zombie: Dictionary): return not dead_zombies.has(zombie.zombie_id)
	)
