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
var player_id_to_player_node_id_map: Dictionary
var player_tries: Dictionary
var player_active_inputs: Dictionary
var dead_zombies: Dictionary
var last_potential_target_zombies: Dictionary
var game_stated: bool
var bullet = load("res://scenes/world/bullet.tscn")


func _ready():
	$UI/HitRect.visible = false
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
			for zombie in message.data.room.zombies:
				print(zombie)
				var zombie_node = zombie_scene.instantiate()
				zombie_node.position = Vector3(
					zombie.position.x, zombie.position.y, zombie.position.z
				)
				zombie_node.from_dict({"label": zombie.word, "target_player_id": zombie.userId})
				var word_item = {"zombie_id": len(words)}
				word_item.merge({"userId": zombie.userId, "word": zombie.word})
				words.append(word_item)
				$ZombieContainer.add_child(zombie_node)

			var position_index = 0
			for user in message.data.room.users.values():
				var user_words = (
					words
					. filter(
						func(word: Dictionary): return word.userId == user.id,
					)
				)
				var trie = Trie.new()
				(
					trie
					. form_trie(
						user_words,
						func(item: Dictionary): return item.word,
						func(item: Dictionary): return item,
					)
				)
				player_tries[user.id] = trie
				player_active_inputs[user.id] = ""
				last_potential_target_zombies[user.id] = []
				player_id_to_player_node_id_map[user.id] = position_index

				var player_node = player_scene.instantiate()
				player_node.position = player_positions[position_index]
				player_node.from_dict(user)
				player_node.player_hit.connect(_on_player_hit)
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
		DataStore.web_socket_client.send({"event": "ready", "data": {"roomId": DataStore.room_id}})
		$RoundStartLabel.visible = true
		$RemainingTimeLabel.visible = false


func reset_active_zombies(indexs: Array):
	for index in indexs:
		var node = $ZombieContainer.get_child(index)
		node.set_active("")


func on_player_inputted_key(player_id: String, key: String):
	if DataStore.player_id == player_id:
		var player_node_id = player_id_to_player_node_id_map[player_id]
		var player_node = $PlayerContainer.get_child(player_node_id)
		var gun_animation = player_node.get_node("Head/Rifle/AnimationPlayer")
		if !gun_animation.is_playing():
			gun_animation.play("Shoot")

	player_active_inputs[player_id] += key
	var potential_target_zombies: Array = player_tries[player_id].get_potential_candidates(
		player_active_inputs[player_id]
	)
	potential_target_zombies = potential_target_zombies.filter(
		func(zombie: Dictionary): return not dead_zombies.has(zombie.zombie_id)
	)

	if potential_target_zombies.is_empty():
		player_active_inputs[player_id] = ""
		reset_active_zombies(
			last_potential_target_zombies[player_id].map(
				func(item: Dictionary): return item.zombie_id
			)
		)
		return

	for zombie in potential_target_zombies:
		var zombie_node = $ZombieContainer.get_child(zombie.zombie_id)
		zombie_node.set_active(player_active_inputs[player_id])

		var player_node_id = player_id_to_player_node_id_map[zombie.userId]
		var player_node = $PlayerContainer.get_child(player_node_id)

		var gun_instance = player_node.get_node("Head/Rifle")
		var gun_barrel = player_node.get_node("Head/Rifle/RayCast3D")
		var bullet_instance = bullet.instantiate()
		bullet_instance.position = gun_barrel.global_position

		var zombie_vector = player_node.position.direction_to(zombie_node.position)
		var zombie_basis = player_node.basis.looking_at(zombie_vector)
		bullet_instance.transform.basis = basis.slerp(zombie_basis, 1)
		gun_instance.transform.basis = basis.slerp(zombie_basis, 1)

		var zombie_angle = atan2(
			zombie_node.position.x - player_node.position.x,
			zombie_node.position.z - player_node.position.z
		)
		var face_angle = atan2(player_node.position.x, player_node.position.z)
		if zombie_angle < 0:
			if (zombie_angle + PI) >= 0.35:
				bullet_instance.rotate_object_local(Vector3.UP, 0 - face_angle - 0.03)
			elif (zombie_angle + PI) < 0.35 && (zombie_angle + PI) >= 0.25:
				bullet_instance.rotate_object_local(Vector3.UP, 0 - face_angle - 0.05)
			elif (zombie_angle + PI) < 0.25 && (zombie_angle + PI) >= 0.10:
				bullet_instance.rotate_object_local(Vector3.UP, 0 - face_angle - 0.025)
			elif (zombie_angle + PI) < 0.10 && (zombie_angle + PI) >= 0.02:
				bullet_instance.rotate_object_local(Vector3.UP, 0.015)
			else:
				pass
		# elif zombie_angle > 0:
		# 	bullet_instance.rotate_y(zombie_angle + PI - face_angle)
		get_parent().add_child(bullet_instance)

		if zombie.word == player_active_inputs[player_id]:
			dead_zombies[zombie.zombie_id] = zombie
			zombie_node.killed()
			player_active_inputs[player_id] = ""

	var inactive_zombie_ids = (
		last_potential_target_zombies[player_id]
		. filter(
			func(item1: Dictionary): return not potential_target_zombies.any(
				func(item2: Dictionary): return item1.zombie_id == item2.zombie_id
			)
		)
		. map(func(item: Dictionary): return item.zombie_id)
	)
	reset_active_zombies(inactive_zombie_ids)
	last_potential_target_zombies[player_id] = potential_target_zombies.filter(
		func(zombie: Dictionary): return not dead_zombies.has(zombie.zombie_id)
	)


func _physics_process(delta):
	if not game_stated:
		return

	var zombie_child = $ZombieContainer.get_children()
	var player_child = $PlayerContainer.get_children()
	for zombie in zombie_child:
		for player in player_child:
			if player.player_id == zombie.target_player_id:
				zombie.move_to_player(delta, game_stated, player)
				break


func _on_player_hit():
	$UI/HitRect.visible = true
	await get_tree().create_timer(0.1).timeout
	$UI/HitRect.visible = false
