extends CharacterBody3D

@export var target_player_id: String
@export var word_label: String
@export var initial_word_label_container_position: Vector3
@export var word_finished: bool

@onready var nav_agent = $NavigationAgent3D
@onready var anim_tree = $AnimationTree

var player_node
var player_position
var state_machine

const SPEED = 2.0
const ATTACK_RANGE = 3.5

func _ready():
	word_finished = false
	$WordLabelContainer.visible = false
	state_machine = anim_tree.get("parameters/playback")

func from_dict(dict: Dictionary):
	target_player_id = dict.target_player_id
	word_label = dict.label
	if DataStore.player_id != target_player_id:
		$WordLabelContainer/ActiveWordLabel.modulate = Color.CORAL
	$WordLabelContainer/ActiveWordLabel.text = ""
	$WordLabelContainer/NonActiveWordLabel.text = dict.label
	if $WordLabelContainer/ActiveWordLabel.font == null:
		$WordLabelContainer/ActiveWordLabel.font = SystemFont.new()
	if $WordLabelContainer/NonActiveWordLabel.font == null:
		$WordLabelContainer/NonActiveWordLabel.font = SystemFont.new()
	$WordLabelContainer.position.x += get_non_active_word_label_width() / 2
	initial_word_label_container_position = $WordLabelContainer.position

func get_active_word_label_string_size(s: String=$WordLabelContainer/ActiveWordLabel.text):
	return $WordLabelContainer/ActiveWordLabel.font.get_string_size(
		s,
		$WordLabelContainer/ActiveWordLabel.horizontal_alignment,
		$WordLabelContainer/ActiveWordLabel.width,
		$WordLabelContainer/ActiveWordLabel.font_size,
	).x * $WordLabelContainer/ActiveWordLabel.pixel_size

func get_non_active_word_label_width(s: String=$WordLabelContainer/NonActiveWordLabel.text):
	return $WordLabelContainer/NonActiveWordLabel.font.get_string_size(
		s,
		$WordLabelContainer/NonActiveWordLabel.horizontal_alignment,
		$WordLabelContainer/NonActiveWordLabel.width,
		$WordLabelContainer/NonActiveWordLabel.font_size,
	).x * $WordLabelContainer/NonActiveWordLabel.pixel_size

func set_active(s: String):
	var non_active_word_label = word_label.trim_prefix(s)
	if non_active_word_label != word_label or s == "":
		$WordLabelContainer/ActiveWordLabel.text = s
		$WordLabelContainer/NonActiveWordLabel.text = non_active_word_label
		$WordLabelContainer.position.x = initial_word_label_container_position.x - get_active_word_label_string_size(s)

func move_to_player(amount, game_started: bool, player: CharacterBody3D):
	player_node = player
	player_position = player_node.position
#	$WordLabelContainer.scale.x = global_position.distance_to(player_position) / 20
#	$WordLabelContainer.scale.y = global_position.distance_to(player_position) / 20
	velocity = Vector3.ZERO
	
	match state_machine.get_current_node():
		"Spawn":
			$WordLabelContainer.visible = true
		"Walking":
			#Navigation
			nav_agent.set_target_position(player_position)
			var next_nav_point = nav_agent.get_next_path_position()
			velocity = (next_nav_point - global_transform.origin).normalized() * SPEED
			rotation.y = lerp_angle(rotation.y, atan2(-velocity.x, -velocity.z), amount * 10)
			look_at(Vector3(player_position.x + velocity.x, 0.5 + velocity.y, player_position.z + velocity.z), Vector3.UP)
		"Attack":
			look_at(Vector3(player_position.x, 0.5, player_position.z), Vector3.UP)
		"Death":
			$WordLabelContainer.visible = false

	anim_tree.set("parameters/conditions/spawn", game_started)
	anim_tree.set("parameters/conditions/death", word_finished)
	anim_tree.set("parameters/conditions/attack", _target_in_range(player_position))
	
	move_and_slide()
	
func killed():
	word_finished = true
	
func _target_in_range(target_position: Vector3):
	return global_position.distance_to(target_position) < ATTACK_RANGE

func _hit_finished():
	player_node.hit()
