extends CharacterBody3D

const ATTACK_RANGE = 3.5

@export var zombie_id: String
@export var target_player_id: String
@export var word_label: String
@export var initial_word_label_container_position: Vector3
@export var word_finished: bool

var player_node
var player_position
var state_machine
var time_to_attack
var ready_to_attack
var attack
var speed
var white = Color("#ffffff")
var green = Color("#639765")

@onready var nav_agent = $NavigationAgent3D
@onready var anim_tree = $AnimationTree


func _ready():
	attack = false
	word_finished = false
	ready_to_attack = false
	$WordLabelContainer.visible = false
	state_machine = anim_tree.get("parameters/playback")
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)


func from_dict(dict: Dictionary):
	zombie_id = dict.zombie_id
	target_player_id = dict.target_player_id
	word_label = dict.label
	time_to_attack = dict.time_to_attack
	if DataStore.player_id != target_player_id:
		$WordLabelContainer/SubViewport/RichTextLabel.add_theme_color_override(
			"default_color", Color.CORAL
		)
		$Armature/Skeleton3D/Body.transparency = 0.2
		$WordLabelContainer/Sprite3D.modulate.a = 0.75
	$WordLabelContainer/SubViewport/RichTextLabel.parse_bbcode(set_center_tags(dict.label))
	$WordLabelContainer/SubViewport.size = Vector2i(
		get_active_word_label_string_size(dict.label), $WordLabelContainer/SubViewport.size.y
	)
	if $WordLabelContainer/SubViewport/RichTextLabel.get_theme_font("normal_font") == null:
		$WordLabelContainer/SubViewport/RichTextLabel.add_theme_font_override(
			"normal_font", SystemFont.new()
		)


func set_active(s: String):
	var next_character_index = s.length()
	var non_active_word_label = word_label.trim_prefix(s)
	var green_text = (
		get_bbcode_color_tag(green)
		+ word_label.substr(0, next_character_index)
		+ get_bbcode_end_color_tag()
	)
	var white_text = ""
	if non_active_word_label != word_label or s == "":
		white_text = (
			get_bbcode_color_tag(white)
			+ word_label.substr(
				next_character_index, word_label.length() - next_character_index + 1
			)
			+ get_bbcode_end_color_tag()
		)
		$WordLabelContainer/SubViewport/RichTextLabel.parse_bbcode(
			set_center_tags(green_text + white_text)
		)
	else:
		var default_text = (
			get_bbcode_color_tag(white)
			+ word_label.substr(0, word_label.length())
			+ get_bbcode_end_color_tag()
		)
		$WordLabelContainer/SubViewport/RichTextLabel.parse_bbcode(set_center_tags(default_text))


func get_active_word_label_string_size(s: String):
	return (
		(
			$WordLabelContainer/SubViewport/RichTextLabel
			. get_theme_font("normal_font")
			. get_string_size(
				s,
				$WordLabelContainer/SubViewport/RichTextLabel.get_theme_font_size(
					"normal_font_size"
				),
			)
			. x
		)
		* 4
	)


func get_bbcode_color_tag(color: Color) -> String:
	return "[color=#" + color.to_html(false) + "]"


func get_bbcode_end_color_tag() -> String:
	return "[/color]"


func set_center_tags(string_to_center: String):
	return "[center]" + string_to_center + "[/center]"


func move_to_player(amount, game_started: bool, player: CharacterBody3D):
	player_node = player
	player_position = player_node.position
	velocity = Vector3.ZERO

	match state_machine.get_current_node():
		"Walking":
			$WordLabelContainer.visible = true
			#Navigation
			nav_agent.set_target_position(player_position)
			var next_nav_point = nav_agent.get_next_path_position()
			var distance = global_position.distance_to(player_node.position) + 2
			if not speed:
				speed = distance / (time_to_attack + 0.667)
			velocity = (next_nav_point - global_transform.origin).normalized() * speed
			rotation.y = lerp_angle(rotation.y, atan2(-velocity.x, -velocity.z), amount * 10)
			look_at(
				Vector3(
					player_position.x + velocity.x, 0.5 + velocity.y, player_position.z + velocity.z
				),
				Vector3.UP
			)
			if Engine.get_process_frames() % 35 == 0:
				$WordLabelContainer/SubViewport/RichTextLabel.add_theme_font_size_override(
					"normal_font_size",
					(
						$WordLabelContainer/SubViewport/RichTextLabel.get_theme_font_size(
							"normal_font_size"
						)
						- 1
					)
				)
				$WordLabelContainer/SubViewport.size = Vector2i(
					$WordLabelContainer/SubViewport.size.x - 1,
					$WordLabelContainer/SubViewport.size.y
				)
			if Engine.get_process_frames() % 70 == 0:
				$WordLabelContainer/SubViewport.size = Vector2i(
					$WordLabelContainer/SubViewport.size.x,
					$WordLabelContainer/SubViewport.size.y - 1
				)
		"Attack":
			look_at(Vector3(player_position.x, 0.5, player_position.z), Vector3.UP)
		"Death":
			$WordLabelContainer.visible = false

	anim_tree.set("parameters/conditions/spawn", game_started)
	anim_tree.set("parameters/conditions/death", word_finished)
	anim_tree.set("parameters/conditions/wait", ready_to_attack)
	anim_tree.set("parameters/conditions/attack", attack)

	move_and_slide()


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"attack":
			if message.data.zombieId == zombie_id:
				attack = true
		"attackEnd":
			if message.data.zombieId == zombie_id:
				attack = false
		"remainingTime":
			if message.data.currentTime > time_to_attack * 1000:
				ready_to_attack = true


func killed():
	word_finished = true


func _target_in_range(target_position: Vector3):
	return global_position.distance_to(target_position) < ATTACK_RANGE


func _hit_finished():
	pass
