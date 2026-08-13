import StatusMessages from './components/common/StatusMessages'
import Toast from './components/common/Toast'
import SajuForm from './components/form/SajuForm'
import AuthScreen from './components/layout/AuthScreen'
import GuestTopBar from './components/layout/GuestTopBar'
import HomeHeader from './components/layout/HomeHeader'
import LoadingPanel from './components/layout/LoadingPanel'
import Sidebar from './components/layout/Sidebar'
import ProfileChip from './components/profile/ProfileChip'
import ProfileModal from './components/profile/ProfileModal'
import ModeBanner from './components/result/ModeBanner'
import ResultPanel from './components/result/ResultPanel'
import { useSajuWorkspace } from './hooks/useSajuWorkspace'

export default function App() {
  const {
    auth,
    boot,
    user,
    form,
    readings,
    result,
    ui,
    actions,
  } = useSajuWorkspace()

  if (boot.loading) {
    return <AuthScreen caption="분석 중!" lede={boot.message} />
  }

  return (
    <div className={user.isGuest ? 'layout layout-guest' : 'layout'}>
      {user.isGuest ? (
        <GuestTopBar
          authBusy={auth.busy}
          onSignIn={() => actions.handleGuestSignIn('guest_topbar')}
        />
      ) : (
        <Sidebar
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          profileSummary={user.profileSummary}
          profileReady={user.profileReady}
          profileRequired={user.profileRequired}
          authBusy={auth.busy}
          readings={readings.list}
          selectedId={readings.selectedId}
          listLoading={readings.listLoading}
          listError={readings.listError}
          busy={ui.busy}
          deletingId={readings.deletingId}
          onOpenProfile={() => actions.openProfileEditor('sidebar')}
          onSignOut={auth.signOut}
          onNewReading={() => actions.startNewReading('sidebar')}
          onSelectReading={actions.applyReading}
          onDeleteReading={(id, name) => void actions.handleDelete(id, name, 'sidebar')}
        />
      )}

      <div className="app">
        <HomeHeader
          isGuest={user.isGuest}
          isViewingSaved={form.isViewingSaved}
          profileReady={user.profileReady}
          showTrustStat={ui.showTrustStat}
          readingCount={ui.readingCount}
          result={result.text}
          loading={ui.loading}
        />
        {user.isGuest && auth.error && <p className="error">{auth.error}</p>}

        {user.profileReady && !form.isViewingSaved && (
          <ProfileChip
            profile={user.profile}
            profileSummary={user.profileSummary}
            onEdit={() => actions.openProfileEditor('profile_chip')}
          />
        )}

        {form.isViewingSaved && (
          <ModeBanner
            name={form.name}
            isDirty={form.isDirty}
            busy={ui.busy}
            saving={ui.saving}
            onSaveInfo={() => void actions.handleSaveInfo()}
            onDelete={() => void actions.handleDelete(readings.selectedId, form.name, 'mode_banner')}
            onNewReading={() => actions.startNewReading('mode_banner')}
          />
        )}

        <SajuForm
          formRef={form.formRef}
          nameInputRef={form.nameInputRef}
          values={{
            name: form.name,
            birthDate: form.birthDate,
            birthTime: form.birthTime,
            timeUnknown: form.timeUnknown,
            gender: form.gender,
            calendarType: form.calendarType,
          }}
          fieldErrors={form.fieldErrors}
          disabled={form.disabled}
          canSubmit={form.canSubmit}
          loading={ui.loading}
          isViewingSaved={form.isViewingSaved}
          onSubmit={actions.handleAnalyze}
          onFormStart={actions.handleFormStart}
          onNameChange={actions.updateName}
          onBirthDateChange={actions.updateBirthDate}
          onBirthTimeChange={actions.updateBirthTime}
          onTimeUnknownChange={actions.updateTimeUnknown}
          onGenderChange={actions.updateGender}
          onCalendarTypeChange={actions.updateCalendarType}
        />

        {ui.loading && <LoadingPanel />}
        <StatusMessages error={ui.error} notice={ui.notice} />

        {result.text && (
          <ResultPanel
            key={readings.selectedId ?? `result-${result.text.slice(0, 24)}`}
            resultRef={result.resultRef}
            selectedId={readings.selectedId}
            name={form.name}
            metaText={result.metaText}
            resultText={result.text}
            gated={result.gated}
            gatedParts={result.gatedParts}
            copied={result.copied}
            linkCopied={result.linkCopied}
            isViewingSaved={form.isViewingSaved}
            busy={ui.busy}
            authBusy={auth.busy}
            authError={auth.error}
            onShare={() => void actions.handleShareResult()}
            onCopy={actions.handleCopyResult}
            onDelete={() => void actions.handleDelete(readings.selectedId, form.name, 'result_panel')}
            onNewReading={() => actions.startNewReading('result_panel')}
            onSignIn={() => actions.handleGuestSignIn('result_gate')}
          />
        )}
      </div>

      <ProfileModal
        open={user.showProfileModal}
        required={user.profileRequired}
        initialProfile={user.profileModalInitial}
        saving={user.profileSaving}
        onSave={actions.handleSaveProfile}
        onClose={actions.closeProfileModal}
      />

      <Toast toast={ui.toast} />
    </div>
  )
}
