extends PanelContainer

@export var title: String:
	get:
		return $MarginContainer/VBoxContainer/Title.text
	set(value):
		$MarginContainer/VBoxContainer/Title.text = value
@export var content: String:
	get:
		return $MarginContainer/VBoxContainer/Content.text
	set(value):
		$MarginContainer/VBoxContainer/Content.text = value
