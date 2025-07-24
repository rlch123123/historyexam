// 데이터 관리 클래스
class ApplicationManager {
    constructor() {
        this.storageKey = 'examApplications';
    }

    // 원서 접수 처리
    async submitApplication(data) {
        try {
            const applications = this.getAllApplications();
            const newApplication = {
                id: this.generateId(),
                ...data,
                submittedAt: new Date().toISOString()
            };
            
            applications.push(newApplication);
            localStorage.setItem(this.storageKey, JSON.stringify(applications));
            return true;
        } catch (error) {
            console.error('원서 접수 중 오류:', error);
            return false;
        }
    }

    // 모든 접수 정보 조회
    getAllApplications() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('데이터 조회 중 오류:', error);
            return [];
        }
    }

    // 접수 정보 수정
    async updateApplication(id, data) {
        try {
            const applications = this.getAllApplications();
            const index = applications.findIndex(app => app.id === id);
            
            if (index !== -1) {
                applications[index] = { ...applications[index], ...data };
                localStorage.setItem(this.storageKey, JSON.stringify(applications));
                return true;
            }
            return false;
        } catch (error) {
            console.error('데이터 수정 중 오류:', error);
            return false;
        }
    }

    // 접수 정보 삭제
    async deleteApplication(id) {
        try {
            const applications = this.getAllApplications();
            const filteredApplications = applications.filter(app => app.id !== id);
            localStorage.setItem(this.storageKey, JSON.stringify(filteredApplications));
            return true;
        } catch (error) {
            console.error('데이터 삭제 중 오류:', error);
            return false;
        }
    }

    // 엑셀 파일 다운로드
    async exportToExcel() {
        try {
            const applications = this.getAllApplications();
            
            if (applications.length === 0) {
                throw new Error('다운로드할 데이터가 없습니다.');
            }

            // CSV 형식으로 데이터 변환
            const headers = ['이름', '성별', '반', '생년월일', '응시과목', '접수일시'];
            const csvContent = [
                headers.join(','),
                ...applications.map(app => [
                    app.name,
                    app.gender,
                    app.classNumber,
                    app.birthDate,
                    app.subject,
                    new Date(app.submittedAt).toLocaleString('ko-KR')
                ].join(','))
            ].join('\n');

            // BOM 추가 (한글 깨짐 방지)
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // 다운로드 링크 생성
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `준서실록능력검정시험_접수자명단_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return true;
        } catch (error) {
            console.error('엑셀 다운로드 중 오류:', error);
            throw error;
        }
    }

    // ID 생성
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// 개선된 인증 관리 클래스
class AuthManager {
    constructor() {
        this.adminPassword = 'admin123';
        this.authKey = 'adminAuthenticated';
        this.attemptsKey = 'loginAttempts';
        this.lockTimeKey = 'lockTime';
        this.maxAttempts = 5;
        this.lockDuration = 15 * 60 * 1000; // 15분
    }

    // 관리자 로그인
    async login(password) {
        // 계정 잠금 상태 확인
        if (this.isLocked()) {
            const remainingTime = this.getRemainingLockTime();
            throw new Error(`계정이 잠겨있습니다. ${Math.ceil(remainingTime / 60000)}분 후 다시 시도해주세요.`);
        }

        if (password === this.adminPassword) {
            sessionStorage.setItem(this.authKey, 'true');
            this.resetLoginAttempts();
            return true;
        } else {
            this.incrementLoginAttempts();
            const attempts = this.getLoginAttempts();
            const remaining = this.maxAttempts - attempts;
            
            if (remaining <= 0) {
                this.lockAccount();
                throw new Error('로그인 시도 횟수를 초과했습니다. 계정이 15분간 잠겼습니다.');
            } else {
                throw new Error(`비밀번호가 올바르지 않습니다. (남은 시도: ${remaining}회)`);
            }
        }
    }

    // 로그아웃
    logout() {
        sessionStorage.removeItem(this.authKey);
    }

    // 인증 상태 확인
    isAuthenticated() {
        return sessionStorage.getItem(this.authKey) === 'true';
    }

    // 로그인 시도 횟수 조회
    getLoginAttempts() {
        const attempts = localStorage.getItem(this.attemptsKey);
        return attempts ? parseInt(attempts) : 0;
    }

    // 로그인 시도 횟수 증가
    incrementLoginAttempts() {
        const attempts = this.getLoginAttempts() + 1;
        localStorage.setItem(this.attemptsKey, attempts.toString());
    }

    // 로그인 시도 횟수 초기화
    resetLoginAttempts() {
        localStorage.removeItem(this.attemptsKey);
        localStorage.removeItem(this.lockTimeKey);
    }

    // 계정 잠금
    lockAccount() {
        const lockTime = Date.now() + this.lockDuration;
        localStorage.setItem(this.lockTimeKey, lockTime.toString());
    }

    // 계정 잠금 상태 확인
    isLocked() {
        const lockTime = localStorage.getItem(this.lockTimeKey);
        if (!lockTime) return false;
        
        const lockTimeMs = parseInt(lockTime);
        if (Date.now() > lockTimeMs) {
            this.resetLoginAttempts();
            return false;
        }
        return true;
    }

    // 남은 잠금 시간 (밀리초)
    getRemainingLockTime() {
        const lockTime = localStorage.getItem(this.lockTimeKey);
        if (!lockTime) return 0;
        
        const lockTimeMs = parseInt(lockTime);
        return Math.max(0, lockTimeMs - Date.now());
    }

    // 남은 시도 횟수
    getRemainingAttempts() {
        return Math.max(0, this.maxAttempts - this.getLoginAttempts());
    }
}

// 개선된 UI 관리 클래스
class UIManager {
    constructor(applicationManager, authManager) {
        this.applicationManager = applicationManager;
        this.authManager = authManager;
        this.deleteTargetId = null;
        this.initializeEventListeners();
    }

    // 이벤트 리스너 초기화
    initializeEventListeners() {
        // 원서접수 폼 제출
        document.getElementById('applicationSubmitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleApplicationSubmit(e);
        });

        // 관리자 로그인 버튼
        document.getElementById('adminLoginBtn').addEventListener('click', () => {
            this.showAdminLoginModal();
        });

        // 관리자 로그인 폼 제출
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin(e);
        });

        // 로그아웃 버튼
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // 엑셀 다운로드 버튼
        document.getElementById('exportExcelBtn').addEventListener('click', () => {
            this.handleExcelExport();
        });

        // 수정 폼 제출
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditSubmit(e);
        });

        // 삭제 확인 버튼
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.handleDeleteConfirm();
        });

        // 모달 이벤트 리스너
        document.getElementById('adminLoginModal').addEventListener('shown', () => {
            document.getElementById('adminPassword').focus();
        });

        // Enter 키로 로그인
        document.getElementById('adminPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('adminLoginForm').dispatchEvent(new Event('submit'));
            }
        });

        // 페이지 로드 시 인증 상태 확인
        if (this.authManager.isAuthenticated()) {
            this.navigateToAdminPage();
        }
    }

    // 원서접수 처리
    async handleApplicationSubmit(e) {
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name').trim(),
            gender: formData.get('gender'),
            classNumber: formData.get('classNumber'),
            birthDate: formData.get('birthDate'),
            subject: formData.get('subject').trim()
        };

        // 유효성 검사
        if (!data.name || !data.gender || !data.classNumber || !data.birthDate || !data.subject) {
            this.showMessage('모든 필드를 입력해주세요.', 'error');
            return;
        }

        const success = await this.applicationManager.submitApplication(data);
        
        if (success) {
            this.showMessage('원서접수가 완료되었습니다.', 'success');
            e.target.reset();
        } else {
            this.showMessage('원서접수 중 오류가 발생했습니다.', 'error');
        }
    }

    // 관리자 로그인 모달 표시
    showAdminLoginModal() {
        // 잠금 상태 확인
        if (this.authManager.isLocked()) {
            const remainingTime = this.authManager.getRemainingLockTime();
            this.showMessage(`계정이 잠겨있습니다. ${Math.ceil(remainingTime / 60000)}분 후 다시 시도해주세요.`, 'error');
            return;
        }

        // 남은 시도 횟수 업데이트
        this.updateRemainingAttempts();
        
        // 오류 메시지 초기화
        this.hideLoginError();
        
        // 비밀번호 입력 필드 초기화
        document.getElementById('adminPassword').value = '';
        
        // 모달 표시
        document.getElementById('adminLoginModal').showModal();
        
        // 포커스 설정
        setTimeout(() => {
            document.getElementById('adminPassword').focus();
        }, 100);
    }

    // 관리자 로그인 처리
    async handleAdminLogin(e) {
        const password = document.getElementById('adminPassword').value.trim();
        const submitBtn = document.getElementById('loginSubmitBtn');
        const spinner = document.getElementById('loginSpinner');
        
        if (!password) {
            this.showLoginError('비밀번호를 입력해주세요.');
            return;
        }

        // 로딩 상태 표시
        submitBtn.disabled = true;
        spinner.classList.remove('hidden');
        
        try {
            const success = await this.authManager.login(password);
            
            if (success) {
                document.getElementById('adminLoginModal').close();
                document.getElementById('adminPassword').value = '';
                this.navigateToAdminPage();
                this.showMessage('관리자 로그인 성공', 'success');
            }
        } catch (error) {
            this.showLoginError(error.message);
            this.updateRemainingAttempts();
            
            // 비밀번호 필드 초기화 및 포커스
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminPassword').focus();
        } finally {
            // 로딩 상태 해제
            submitBtn.disabled = false;
            spinner.classList.add('hidden');
        }
    }

    // 로그인 오류 메시지 표시
    showLoginError(message) {
        const errorAlert = document.getElementById('loginErrorAlert');
        const errorMessage = document.getElementById('loginErrorMessage');
        
        errorMessage.textContent = message;
        errorAlert.classList.remove('hidden');
        
        // 3초 후 자동 숨김
        setTimeout(() => {
            this.hideLoginError();
        }, 3000);
    }

    // 로그인 오류 메시지 숨김
    hideLoginError() {
        document.getElementById('loginErrorAlert').classList.add('hidden');
    }

    // 남은 시도 횟수 업데이트
    updateRemainingAttempts() {
        const remainingAttempts = this.authManager.getRemainingAttempts();
        document.getElementById('remainingAttempts').textContent = remainingAttempts;
        
        // 경고 메시지 표시
        if (remainingAttempts <= 2 && remainingAttempts > 0) {
            const warningAlert = document.getElementById('lockWarningAlert');
            const warningMessage = document.getElementById('lockWarningMessage');
            warningMessage.textContent = `${remainingAttempts}회 더 실패하면 계정이 15분간 잠깁니다.`;
            warningAlert.classList.remove('hidden');
        } else {
            document.getElementById('lockWarningAlert').classList.add('hidden');
        }
    }

    // 관리자 페이지로 이동
    navigateToAdminPage() {
        document.getElementById('applicationForm').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        this.loadApplicationsTable();
    }

    // 원서접수 폼 표시
    showApplicationForm() {
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('applicationForm').classList.remove('hidden');
    }

    // 로그아웃 처리
    handleLogout() {
        this.authManager.logout();
        this.showApplicationForm();
        this.showMessage('로그아웃되었습니다.', 'success');
    }

    // 접수자 목록 테이블 로드
    loadApplicationsTable() {
        const applications = this.applicationManager.getAllApplications();
        const tbody = document.getElementById('applicationsTableBody');
        
        if (applications.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-500">
                        접수된 원서가 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = applications.map(app => `
            <tr>
                <td class="font-medium">${app.name}</td>
                <td>${app.gender}</td>
                <td>${app.classNumber}</td>
                <td>${app.birthDate}</td>
                <td>${app.subject}</td>
                <td>${new Date(app.submittedAt).toLocaleString('ko-KR')}</td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-sm btn-outline btn-primary" onclick="uiManager.showEditModal('${app.id}')">
                            수정
                        </button>
                        <button class="btn btn-sm btn-outline btn-error" onclick="uiManager.showDeleteModal('${app.id}')">
                            삭제
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // 수정 모달 표시
    showEditModal(id) {
        const applications = this.applicationManager.getAllApplications();
        const application = applications.find(app => app.id === id);
        
        if (!application) {
            this.showMessage('해당 접수 정보를 찾을 수 없습니다.', 'error');
            return;
        }

        // 폼 필드에 데이터 설정
        document.getElementById('editId').value = application.id;
        document.getElementById('editName').value = application.name;
        document.querySelector(`input[name="editGender"][value="${application.gender}"]`).checked = true;
        document.getElementById('editClassNumber').value = application.classNumber;
        document.getElementById('editBirthDate').value = application.birthDate;
        document.getElementById('editSubject').value = application.subject;

        document.getElementById('editModal').showModal();
    }

    // 수정 처리
    async handleEditSubmit(e) {
        const formData = new FormData(e.target);
        const id = document.getElementById('editId').value;
        const data = {
            name: formData.get('editName') ? formData.get('editName').trim() : '',
            gender: formData.get('editGender'),
            classNumber: formData.get('editClassNumber') ? formData.get('editClassNumber') : '',
            birthDate: formData.get('editBirthDate') ? formData.get('editBirthDate') : '',
            subject: formData.get('editSubject') ? formData.get('editSubject').trim() : ''
        };

        // 유효성 검사
        if (!data.name || !data.gender || !data.classNumber || !data.birthDate || !data.subject) {
            this.showMessage('모든 필드를 입력해주세요.', 'error');
            return;
        }

        const success = await this.applicationManager.updateApplication(id, data);
        
        if (success) {
            document.getElementById('editModal').close();
            this.loadApplicationsTable();
            this.showMessage('접수 정보가 수정되었습니다.', 'success');
        } else {
            this.showMessage('수정 중 오류가 발생했습니다.', 'error');
        }
    }

    // 삭제 모달 표시
    showDeleteModal(id) {
        this.deleteTargetId = id;
        document.getElementById('deleteModal').showModal();
    }

    // 삭제 확인 처리
    async handleDeleteConfirm() {
        if (!this.deleteTargetId) return;

        const success = await this.applicationManager.deleteApplication(this.deleteTargetId);
        
        if (success) {
            document.getElementById('deleteModal').close();
            this.loadApplicationsTable();
            this.showMessage('접수 정보가 삭제되었습니다.', 'success');
        } else {
            this.showMessage('삭제 중 오류가 발생했습니다.', 'error');
        }
        
        this.deleteTargetId = null;
    }

    // 엑셀 다운로드 처리
    async handleExcelExport() {
        try {
            await this.applicationManager.exportToExcel();
            this.showMessage('엑셀 파일이 다운로드되었습니다.', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    // 메시지 표시
    showMessage(message, type = 'info') {
        const toast = document.getElementById('toastMessage');
        const toastText = document.getElementById('toastText');
        
        // 기존 클래스 제거
        toast.classList.remove('alert-success', 'alert-error', 'alert-info', 'alert-warning', 'hidden');
        
        // 타입에 따른 클래스 추가
        switch (type) {
            case 'success':
                toast.classList.add('alert-success');
                break;
            case 'error':
                toast.classList.add('alert-error');
                break;
            case 'warning':
                toast.classList.add('alert-warning');
                break;
            default:
                toast.classList.add('alert-info');
        }
        
        toastText.textContent = message;
        
        // 3초 후 자동 숨김
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// 애플리케이션 초기화
const applicationManager = new ApplicationManager();
const authManager = new AuthManager();
const uiManager = new UIManager(applicationManager, authManager);

// 전역 변수로 설정 (HTML에서 접근 가능)
window.uiManager = uiManager;