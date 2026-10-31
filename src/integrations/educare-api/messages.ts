// Mensagens fixas mostradas na interface, num só lugar.
export const messages = {
	unavailable:
		'Não foi possível falar com o servidor. Tente de novo em instantes.',
	forbidden: 'Você não tem permissão para fazer isso.',
	invalidCredentials: 'Email ou senha inválidos.',
	sessionExpired: 'Sua sessão expirou. Entre de novo para continuar.',
	passwordChanged: 'Senha alterada. Outros dispositivos foram desconectados.',
	tooManyAttempts: 'Muitas tentativas. Tente novamente em alguns minutos.',
	validation: 'Confira os campos destacados.',
	notFound: 'Não encontramos o que você procurou.',
	conflict: 'Já existe um registro com esses dados.',
	classroomNameTaken: 'Já existe uma turma com esse nome.',
	classroomHasStudents:
		'Esta turma tem alunos. Tire os alunos da turma antes de excluí-la.',
	classroomNotFound: 'Essa turma não existe mais. A lista foi atualizada.',
	classroomCreated: 'Turma criada.',
	classroomRenamed: 'Turma renomeada.',
	classroomDeleted: 'Turma excluída.',
} as const
