extends HBoxContainer

@export var key: String:
	get:
		return $Key.text
	set(value):
		$Key.text = "[left]%s[/left]" % [value]
@export var value: String:
	get:
		return $Value.text
	set(value):
		$Value.text = "[right]%s[/right]" % [value]
