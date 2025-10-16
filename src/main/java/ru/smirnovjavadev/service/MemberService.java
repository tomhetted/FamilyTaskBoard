package ru.smirnovjavadev.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.domain.Member;
import ru.smirnovjavadev.repository.HouseholdRepository;
import ru.smirnovjavadev.repository.MemberRepository;

import java.util.List;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final HouseholdRepository householdRepository;

    public MemberService(MemberRepository memberRepository, HouseholdRepository householdRepository) {
        this.memberRepository = memberRepository;
        this.householdRepository = householdRepository;
    }

    @Transactional(readOnly = true)
    public Member getById(Long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));
    }

    @Transactional
    public Member create(Long householdId, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new IllegalArgumentException("Household not found"));

        // проверяем дубликаты в household
        if (memberRepository.existsByHouseholdIdAndName(householdId, name)) {
            throw new IllegalArgumentException("Member with this name already exists in household");
        }

        Member member = Member.builder()
                .name(name)
                .household(household)
                .build();

        return memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public List<Member> getAll() {
        return memberRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Member> getAllByHousehold(Long householdId) {
        return memberRepository.findAllByHouseholdIdOrderByNameAsc(householdId);
    }
}
